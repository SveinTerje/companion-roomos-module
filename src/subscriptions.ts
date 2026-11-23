import { CompanionVariableDefinition, CompanionVariableValues } from '@companion-module/base'
import { XAPI } from 'jsxapi'
import { HandleXAPIConfFeedback, HandleXAPIFeedback } from './feedback.js'
import { RoomOSInstanceBase } from './roomos.js'
import {
	XapiKind,
	jsonXapiValue,
	normalizeXapiPath,
	pathToVariableId,
	stringifyXapiValue,
	subscriptionKey,
} from './xapi-path.js'

/** Cisco allows at most 50 xFeedback expressions per session. */
export const MAX_XFEEDBACK_EXPRESSIONS = 50

/** Built-in path-specific registrations applied on every connect. */
const BUILTIN_EXPRESSION_COUNT = 6

export interface CustomSubscription {
	kind: XapiKind
	path: string
	variableId: string
	count: number
}

type OffFn = (() => void) & { registration?: Promise<unknown> }

export class SubscriptionManager {
	private xapi?: XAPI
	private builtinOff: OffFn[] = []
	private custom = new Map<string, CustomSubscription>()
	private customOff = new Map<string, OffFn>()
	private eventLastCount = 0

	constructor(private readonly instance: RoomOSInstanceBase) {}

	public listCustom(kind?: XapiKind): CustomSubscription[] {
		const all = [...this.custom.values()]
		return kind ? all.filter((s) => s.kind === kind) : all
	}

	public liveExpressionCount(): number {
		return this.builtinOff.length + this.customOff.size
	}

	private plannedExpressionCount(): number {
		const builtins = this.xapi ? this.builtinOff.length : BUILTIN_EXPRESSION_COUNT
		return builtins + this.custom.size
	}

	public variableDefinitions(): Record<string, CompanionVariableDefinition> {
		const defs: Record<string, CompanionVariableDefinition> = {
			xfeedback_count: { name: 'Number of xFeedback expressions on this connection' },
			event_last_path: { name: 'Last xEvent path' },
			event_last_value: { name: 'Last xEvent value' },
			event_last_json: { name: 'Last xEvent JSON payload' },
			event_last_time: { name: 'Last xEvent timestamp' },
			event_last_count: { name: 'Last xEvent sequence (use for Companion variable-changed triggers)' },
		}

		for (const sub of this.custom.values()) {
			if (sub.kind === 'status') {
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
		this.applyBuiltins(xapi)
		for (const sub of this.custom.values()) {
			this.activateCustom(xapi, sub)
		}
		this.publishCount()
	}

	public detach(): void {
		for (const off of this.builtinOff) {
			try {
				off()
			} catch {
				// ignore
			}
		}
		this.builtinOff = []
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

		const variableId = pathToVariableId(kind, path)
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
		if (!this.custom.has(key)) {
			return { ok: false, message: `No custom ${kind} subscription for ${path}` }
		}
		this.deactivateCustom(key)
		this.custom.delete(key)
		this.publishCount()
		return { ok: true, message: `Unsubscribed ${kind} ${path}` }
	}

	public unsubscribeAllCustom(): { ok: boolean; message: string } {
		const n = this.custom.size
		for (const key of [...this.custom.keys()]) {
			this.deactivateCustom(key)
			this.custom.delete(key)
		}
		this.publishCount()
		return { ok: true, message: `Removed ${n} custom subscription(s)` }
	}

	private applyBuiltins(xapi: XAPI): void {
		this.builtinOff.push(
			xapi.status.on('Audio', (event: unknown) => {
				HandleXAPIFeedback(this.instance, { Audio: event })
			}) as OffFn
		)
		this.builtinOff.push(
			xapi.status.on('Call', (event: unknown) => {
				HandleXAPIFeedback(this.instance, { Call: this.normalizeCallPayload(event) })
			}) as OffFn
		)
		this.builtinOff.push(
			xapi.status.on('Conference', (event: unknown) => {
				HandleXAPIFeedback(this.instance, { Conference: event })
			}) as OffFn
		)
		this.builtinOff.push(
			xapi.status.on('Time', (event: unknown) => {
				HandleXAPIFeedback(this.instance, { Time: event })
			}) as OffFn
		)
		this.builtinOff.push(
			xapi.status.on('SystemUnit/State/NumberOfActiveCalls', (value: unknown) => {
				this.instance.setVariableValues({ number_of_active_calls: stringifyXapiValue(value) })
			}) as OffFn
		)
		this.builtinOff.push(
			xapi.config.on('Conference/AutoAnswer', (event: unknown) => {
				HandleXAPIConfFeedback(this.instance, { Conference: { AutoAnswer: event } })
			}) as OffFn
		)

		xapi.status
			.get('SystemUnit/State/NumberOfActiveCalls')
			.then((value: unknown) => {
				this.instance.setVariableValues({ number_of_active_calls: stringifyXapiValue(value) })
			})
			.catch((e: unknown) => {
				this.instance.log('error', `Failed to check NumberOfActiveCalls: ${e}`)
			})
	}

	private activateCustom(xapi: XAPI, sub: CustomSubscription): void {
		const key = subscriptionKey(sub.kind, sub.path)
		this.deactivateCustom(key)

		if (sub.kind === 'status') {
			const off = xapi.status.on(sub.path, (value: unknown) => {
				this.instance.setVariableValues({ [sub.variableId]: stringifyXapiValue(value) })
			}) as OffFn
			this.customOff.set(key, off)
			xapi.status
				.get(sub.path)
				.then((value: unknown) => {
					this.instance.setVariableValues({ [sub.variableId]: stringifyXapiValue(value) })
				})
				.catch((e: unknown) => {
					this.instance.log('warn', `xStatus get ${sub.path} failed: ${e}`)
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
