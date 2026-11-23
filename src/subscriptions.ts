import { CompanionVariableDefinition, CompanionVariableValues } from '@companion-module/base'
import { XAPI } from 'jsxapi'
import { FeedbackId, HandleXAPIFeedback } from './feedback.js'
import { RoomOSInstanceBase } from './roomos.js'
import { findStandardStatus, statusVariableId } from './standard-status.js'
import {
	XapiKind,
	jsonXapiValue,
	normalizeXapiPath,
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

		if (this.plannedExpressionCount() >= MAX_XFEEDBACK_EXPRESSIONS) {
			return {
				ok: false,
				message: `xFeedback limit is ${MAX_XFEEDBACK_EXPRESSIONS} expressions per connection`,
			}
		}

		const variableId = kind === 'status' ? statusVariableId(path).variableId : pathToVariableId(kind, path)
		const sub: CustomSubscription = { kind, path, variableId, count: 0 }
		this.custom.set(key, sub)

		if (this.xapi) {
			this.activateCustom(this.xapi, sub)
		}

		this.publishCount()
		return {
			ok: true,
			message: `Subscribed ${kind} ${path} -> ${this.variableHint(sub)}`,
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
		this.deactivateCustom(key)
		this.custom.delete(key)
		if (sub.kind === 'status') {
			this.instance.setVariableValues({ [sub.variableId]: '' })
		}
		this.publishCount()
		return { ok: true, message: `Unsubscribed ${kind} ${path}` }
	}

	public unsubscribeAllCustom(): { ok: boolean; message: string } {
		const n = this.custom.size
		const cleared: CompanionVariableValues = {}
		for (const [key, sub] of [...this.custom.entries()]) {
			this.deactivateCustom(key)
			this.custom.delete(key)
			if (sub.kind === 'status') cleared[sub.variableId] = ''
		}
		if (Object.keys(cleared).length) this.instance.setVariableValues(cleared)
		this.publishCount()
		return { ok: true, message: `Removed ${n} subscription(s)` }
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

	private variableHint(sub: CustomSubscription): string {
		if (sub.kind === 'status') return `variable ${sub.variableId}`
		return `variables ${sub.variableId} / ${sub.variableId}_count (trigger on _count)`
	}

	private formatStatusValue(sub: CustomSubscription, value: unknown): string {
		if (sub.variableId === 'audio_connector_mute') {
			return formatMicrophoneConnectors(value)
		}
		return stringifyXapiValue(value)
	}

	private syncCompanionState(path: string, value: unknown): void {
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
