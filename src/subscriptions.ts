import { CompanionVariableDefinition, CompanionVariableValues } from '@companion-module/base'
import { XAPI } from 'jsxapi'
import { FeedbackId, HandleXAPIFeedback } from './feedback.js'
import { RoomOSInstanceBase } from './roomos.js'
import {
	MAIN_VIDEO_SOURCE_NAME_VARIABLE,
	MAIN_VIDEO_SOURCE_PATH,
	OSD_MODE_PATH,
	VIDEO_INPUT_CONNECTOR_CONFIG_PATH,
	configVariableId,
	describeSubscriptionMapping,
	findStandardConfig,
	findStandardStatus,
	statusVariableId,
} from './standard-status.js'
import {
	XapiKind,
	jsonXapiValue,
	lookupMainVideoSourceName,
	normalizeXapiPath,
	parseVideoInputConnectorNames,
	pathToVariableId,
	stringifyXapiValue,
	subscriptionKey,
} from './xapi-path.js'
import { formatXapiError } from './xapi-rpc.js'

/** Cisco allows at most 50 xFeedback expressions per session. */
export const MAX_XFEEDBACK_EXPRESSIONS = 50

export interface CustomSubscription {
	kind: XapiKind
	path: string
	variableId: string
	count: number
	autoPaired?: boolean
	pairKey?: string
}

type OffFn = (() => void) & { registration?: Promise<unknown> }

export class SubscriptionManager {
	private xapi?: XAPI
	private custom = new Map<string, CustomSubscription>()
	private customOff = new Map<string, OffFn>()
	private eventLastCount = 0

	constructor(private readonly instance: RoomOSInstanceBase) {}

	public listCustom(kind?: XapiKind): CustomSubscription[] {
		const all = [...this.custom.values()]
		return kind ? all.filter((s) => s.kind === kind) : all
	}

	public liveExpressionCount(): number {
		return this.customOff.size
	}

	private plannedExpressionCount(): number {
		return this.custom.size
	}

	public variableDefinitions(): Record<string, CompanionVariableDefinition> {
		const defs: Record<string, CompanionVariableDefinition> = {}

		for (const sub of this.custom.values()) {
			if (sub.kind === 'status') {
				if (findStandardStatus(sub.path)) continue
				defs[sub.variableId] = { name: `xStatus ${sub.path.replace(/\//g, ' ')}` }
			} else if (sub.kind === 'config') {
				if (findStandardConfig(sub.path) || sub.path === VIDEO_INPUT_CONNECTOR_CONFIG_PATH) continue
				defs[sub.variableId] = { name: `xConfiguration ${sub.path.replace(/\//g, ' ')}` }
			} else {
				defs[sub.variableId] = { name: `xEvent ${sub.path.replace(/\//g, ' ')}` }
				defs[`${sub.variableId}_json`] = { name: `xEvent ${sub.path.replace(/\//g, ' ')} JSON` }
				defs[`${sub.variableId}_time`] = { name: `xEvent ${sub.path.replace(/\//g, ' ')} timestamp` }
				defs[`${sub.variableId}_count`] = {
					name: `xEvent ${sub.path.replace(/\//g, ' ')} sequence (variable-changed trigger)`,
				}
			}
		}

		return defs
	}

	public attach(xapi: XAPI): void {
		this.detach()
		this.xapi = xapi
		for (const sub of this.custom.values()) {
			this.activateCustom(xapi, sub)
		}
		this.publishCount()
	}

	public detach(): void {
		for (const off of this.customOff.values()) {
			try {
				off()
			} catch {
				// ignore
			}
		}
		this.customOff.clear()
		this.xapi = undefined
		this.publishCount()
	}

	public subscribe(kind: XapiKind, rawPath: string): { ok: boolean; message: string; variableId?: string } {
		const path = normalizeXapiPath(rawPath)
		if (!path) {
			return { ok: false, message: 'Path is empty' }
		}

		const key = subscriptionKey(kind, path)
		const existing = this.custom.get(key)
		if (existing) {
			return {
				ok: true,
				message: `Already subscribed to ${kind} ${path} as $(${existing.variableId})`,
				variableId: existing.variableId,
			}
		}

		const pairNeeded = kind === 'status' && path === MAIN_VIDEO_SOURCE_PATH
		const extraSlots = pairNeeded && !this.custom.has(subscriptionKey('config', VIDEO_INPUT_CONNECTOR_CONFIG_PATH)) ? 1 : 0
		if (this.plannedExpressionCount() + extraSlots >= MAX_XFEEDBACK_EXPRESSIONS) {
			return {
				ok: false,
				message: `xFeedback limit is ${MAX_XFEEDBACK_EXPRESSIONS} expressions per connection`,
			}
		}

		const variableId =
			kind === 'status'
				? statusVariableId(path).variableId
				: kind === 'config'
					? configVariableId(path).variableId
					: pathToVariableId(kind, path)
		const sub: CustomSubscription = { kind, path, variableId, count: 0 }
		this.custom.set(key, sub)

		if (pairNeeded) {
			this.ensureMainVideoSourceNamePair(sub)
		}

		if (this.xapi) {
			this.activateCustom(this.xapi, sub)
			if (sub.pairKey) {
				const pair = this.custom.get(sub.pairKey)
				if (pair) this.activateCustom(this.xapi, pair)
			}
		}

		this.publishCount()
		return {
			ok: true,
			message: `Subscribed ${kind} ${path} -> ${describeSubscriptionMapping(kind, path, variableId)}`,
			variableId,
		}
	}

	public unsubscribe(kind: XapiKind, rawPath: string): { ok: boolean; message: string } {
		const path = normalizeXapiPath(rawPath)
		if (!path) {
			return { ok: false, message: 'Path is empty' }
		}
		const key = subscriptionKey(kind, path)
		const sub = this.custom.get(key)
		if (!sub) {
			return { ok: false, message: `No ${kind} subscription for ${path}` }
		}
		this.removeSubscription(key, sub)
		this.publishCount()
		return { ok: true, message: `Unsubscribed ${kind} ${path}` }
	}

	public unsubscribeAllCustom(): { ok: boolean; message: string } {
		const n = this.custom.size
		const cleared: CompanionVariableValues = {}
		for (const [key, sub] of [...this.custom.entries()]) {
			this.clearSubscriptionValues(cleared, sub)
			this.deactivateCustom(key)
			this.custom.delete(key)
		}
		if (Object.keys(cleared).length) this.instance.setVariableValues(cleared)
		this.publishCount()
		return { ok: true, message: `Removed ${n} subscription(s)` }
	}

	private ensureMainVideoSourceNamePair(main: CustomSubscription): void {
		const pairKey = subscriptionKey('config', VIDEO_INPUT_CONNECTOR_CONFIG_PATH)
		const existing = this.custom.get(pairKey)
		if (existing) {
			main.pairKey = pairKey
			return
		}
		const pair: CustomSubscription = {
			kind: 'config',
			path: VIDEO_INPUT_CONNECTOR_CONFIG_PATH,
			variableId: '',
			count: 0,
			autoPaired: true,
		}
		this.custom.set(pairKey, pair)
		main.pairKey = pairKey
	}

	private removeSubscription(key: string, sub: CustomSubscription): void {
		const cleared: CompanionVariableValues = {}
		this.clearSubscriptionValues(cleared, sub)
		this.deactivateCustom(key)
		this.custom.delete(key)
		if (sub.pairKey) {
			const pair = this.custom.get(sub.pairKey)
			if (pair?.autoPaired) {
				this.deactivateCustom(sub.pairKey)
				this.custom.delete(sub.pairKey)
			}
		}
		if (Object.keys(cleared).length) this.instance.setVariableValues(cleared)
	}

	private clearSubscriptionValues(cleared: CompanionVariableValues, sub: CustomSubscription): void {
		if (sub.kind === 'event' || !sub.variableId) return
		cleared[sub.variableId] = ''
		if (sub.path === MAIN_VIDEO_SOURCE_PATH) {
			cleared[MAIN_VIDEO_SOURCE_NAME_VARIABLE] = ''
			this.instance.mainVideoSource = ''
		}
		if (sub.path === OSD_MODE_PATH) this.instance.osdMode = ''
		if (sub.path === 'Audio/Volume') this.instance.volumeLevel = undefined
		if (sub.path === VIDEO_INPUT_CONNECTOR_CONFIG_PATH) this.instance.videoInputConnectorNames = {}
	}

	private activateCustom(xapi: XAPI, sub: CustomSubscription): void {
		const key = subscriptionKey(sub.kind, sub.path)
		this.deactivateCustom(key)

		if (sub.kind === 'status') {
			const off = xapi.status.on(sub.path, (value: unknown) => {
				this.instance.setVariableValues({ [sub.variableId]: this.formatStatusValue(sub, value) })
				this.syncCompanionState(sub.path, value)
			}) as OffFn
			this.customOff.set(key, off)
			off.registration?.catch((e: unknown) => {
				this.instance.log('warn', `xStatus subscribe ${sub.path} failed: ${formatXapiError(e)}`)
			})
			return
		}

		if (sub.kind === 'config') {
			const off = xapi.config.on(sub.path, (value: unknown) => {
				this.syncConfigState(sub, value)
			}) as OffFn
			this.customOff.set(key, off)
			off.registration?.catch((e: unknown) => {
				this.instance.log('warn', `xConfiguration subscribe ${sub.path} failed: ${formatXapiError(e)}`)
			})
			return
		}

		const off = xapi.event.on(sub.path, (value: unknown) => {
			sub.count += 1
			this.eventLastCount += 1
			const values: CompanionVariableValues = {
				[sub.variableId]: stringifyXapiValue(value),
				[`${sub.variableId}_json`]: jsonXapiValue(value),
				[`${sub.variableId}_time`]: new Date().toISOString(),
				[`${sub.variableId}_count`]: String(sub.count),
				event_last_path: sub.path,
				event_last_value: stringifyXapiValue(value),
				event_last_json: jsonXapiValue(value),
				event_last_time: new Date().toISOString(),
				event_last_count: String(this.eventLastCount),
			}
			this.instance.setVariableValues(values)
		}) as OffFn
		this.customOff.set(key, off)
		off.registration?.catch((e: unknown) => {
			this.instance.log('warn', `xEvent subscribe ${sub.path} failed: ${formatXapiError(e)}`)
		})
	}

	private deactivateCustom(key: string): void {
		const off = this.customOff.get(key)
		if (off) {
			try {
				off()
			} catch {
				// ignore
			}
			this.customOff.delete(key)
		}
	}

	private publishCount(): void {
		this.instance.setVariableValues({ xfeedback_count: String(this.liveExpressionCount()) })
	}

	private formatStatusValue(sub: CustomSubscription, value: unknown): string {
		if (sub.variableId === 'audio_connector_mute') {
			return formatMicrophoneConnectors(value)
		}
		return stringifyXapiValue(value)
	}

	private syncConfigState(sub: CustomSubscription, value: unknown): void {
		if (sub.path === VIDEO_INPUT_CONNECTOR_CONFIG_PATH) {
			const parsed = parseVideoInputConnectorNames(value)
			if (Object.keys(parsed).length) {
				if (Array.isArray(value)) {
					this.instance.videoInputConnectorNames = parsed
				} else {
					this.instance.videoInputConnectorNames = {
						...this.instance.videoInputConnectorNames,
						...parsed,
					}
				}
				this.publishMainVideoSourceName()
			}
			return
		}

		const text = stringifyXapiValue(value)
		if (sub.variableId) {
			this.instance.setVariableValues({ [sub.variableId]: text })
		}
		if (sub.path === OSD_MODE_PATH) {
			this.instance.osdMode = text
		}
	}

	private syncCompanionState(path: string, value: unknown): void {
		if (path === MAIN_VIDEO_SOURCE_PATH) {
			this.instance.mainVideoSource = stringifyXapiValue(value)
			this.publishMainVideoSourceName()
			void this.fetchConnectorNameIfMissing()
			return
		}
		if (path === 'Audio/Volume') {
			const n = Number.parseInt(stringifyXapiValue(value), 10)
			this.instance.volumeLevel = Number.isFinite(n) ? n : undefined
			this.instance.setVariableValues({ volume: stringifyXapiValue(value) })
			return
		}
		if (path === 'Call' || path.startsWith('Call/')) {
			HandleXAPIFeedback(this.instance, { Call: this.normalizeCallPayload(value) })
			return
		}
		if (path === 'Audio/Microphones/Mute') {
			this.instance.microphoneMute = stringifyXapiValue(value) === 'On'
			this.instance.checkFeedbacks(FeedbackId.MicrophoneMute)
			return
		}
		if (path === 'Audio' || path.startsWith('Audio/')) {
			HandleXAPIFeedback(this.instance, nestStatus('Audio', path, value))
			return
		}
		if (path === 'Conference' || path.startsWith('Conference/')) {
			HandleXAPIFeedback(this.instance, nestStatus('Conference', path, value))
			return
		}
		if (path === 'Time' || path.startsWith('Time/')) {
			HandleXAPIFeedback(this.instance, nestStatus('Time', path, value))
		}
	}

	private publishMainVideoSourceName(): void {
		const id = this.instance.mainVideoSource
		this.instance.setVariableValues({
			MainVideoSource: id,
			[MAIN_VIDEO_SOURCE_NAME_VARIABLE]: lookupMainVideoSourceName(id, this.instance.videoInputConnectorNames),
		})
	}

	private async fetchConnectorNameIfMissing(): Promise<void> {
		const id = this.instance.mainVideoSource
		if (!id || id === 'Composed') return
		if (this.instance.videoInputConnectorNames[id]) return
		if (!this.xapi) return
		try {
			const name = await this.xapi.config.get(`Video Input Connector ${id} Name`)
			if (name != null && String(name) !== '') {
				this.instance.videoInputConnectorNames[id] = String(name)
				this.publishMainVideoSourceName()
			}
		} catch (e: unknown) {
			this.instance.log('warn', `RoomOS: Video Input Connector ${id} Name: ${formatXapiError(e)}`)
		}
	}

	private normalizeCallPayload(event: unknown): unknown[] {
		if (event == null) return []
		if (Array.isArray(event)) return event
		if (typeof event === 'object') {
			const rec = event as Record<string, unknown>
			if ('id' in rec || 'Status' in rec || 'Direction' in rec) {
				return [event]
			}
			return Object.values(rec).filter((v) => v && typeof v === 'object')
		}
		return []
	}
}

function nestStatus(root: string, path: string, value: unknown): Record<string, unknown> {
	const parts = path.split('/').filter(Boolean)
	if (parts[0] !== root) {
		return { [root]: value }
	}
	let cursor: unknown = value
	for (let i = parts.length - 1; i >= 1; i--) {
		cursor = { [parts[i]]: cursor }
	}
	return { [root]: cursor }
}

function formatMicrophoneConnectors(value: unknown): string {
	const list = Array.isArray(value) ? value : value && typeof value === 'object' ? [value] : []
	let muteState = ''
	for (const element of list) {
		if (!element || typeof element !== 'object') continue
		const rec = element as { id?: unknown; Mute?: unknown }
		muteState += `(Mic ${String(rec.id ?? '')} Mute: ${String(rec.Mute ?? '')})`
	}
	return muteState
}
