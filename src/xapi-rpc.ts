let patched = false

/** Cisco JSON-RPC / xAPI application errors; HTTP 502 is not among these. */
const XAPI_RPC_CODES = new Set([
	1, // Command Error
	-31999, // Permission Denied
	-31998, // Subscriber Count Exceeded
	-31997, // Not Ready
	-32700, // Parse Error
	-32600, // Invalid Request
	-32601, // Method Not Found
	-32602, // Invalid Params
	-32603, // Internal Error
])

export function formatXapiError(error: unknown): string {
	if (error == null) return 'unknown error'
	if (typeof error === 'string') return error
	if (typeof error === 'number') return String(error)
	if (error instanceof Error) {
		const code = (error as Error & { code?: unknown }).code
		if (code != null && code !== '') return `${error.message} (code ${String(code)})`
		return error.message || String(error)
	}
	if (typeof error === 'object') {
		const rec = error as { code?: unknown; message?: unknown }
		const parts: string[] = []
		if (rec.code != null) parts.push(`code ${String(rec.code)}`)
		if (rec.message != null && rec.message !== '') parts.push(String(rec.message))
		if (parts.length) return parts.join(': ')
		try {
			return JSON.stringify(error)
		} catch {
			return String(error)
		}
	}
	return String(error)
}

export function isTransportFailure(error: unknown): boolean {
	if (error && typeof error === 'object' && 'code' in error) {
		const code = Number((error as { code: unknown }).code)
		if (XAPI_RPC_CODES.has(code)) return false
	}
	return true
}

/**
 * jsxapi's status.on/event.on/config.on subscribe without NotifyCurrentValue,
 * then this module used to xGet the same nodes for the initial value. Large
 * xGet trees (Audio, Conference) fail on some codecs while xFeedback still
 * works. Ask the codec to push the current value with the subscription instead.
 */
export function subscribeParamsWithCurrentValue(method: string, params: unknown): unknown {
	if (method === 'xFeedback/Subscribe' && params && typeof params === 'object') {
		return { ...(params as Record<string, unknown>), NotifyCurrentValue: true }
	}
	return params
}

type ExecuteFn = (method: string, params?: unknown) => Promise<unknown>

export function installJsxapiPatches(XAPI: { prototype: { execute: ExecuteFn } }): void {
	if (patched) return
	patched = true

	const original = XAPI.prototype.execute
	XAPI.prototype.execute = function (this: unknown, method: string, params?: unknown) {
		const next = subscribeParamsWithCurrentValue(method, params)
		const result = original.call(this, method, next)
		if (method === 'xFeedback/Unsubscribe') {
			return Promise.resolve(result).catch(() => undefined)
		}
		return result
	}
}
