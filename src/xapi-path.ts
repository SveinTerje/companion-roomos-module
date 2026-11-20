export type XapiKind = 'status' | 'event'

const KIND_PREFIX = /^(?:x)?(Status|Event|Configuration)(?=$|[\/.\s])/i

export function normalizeXapiPath(raw: string): string {
	let p = raw.trim()
	if (!p) return ''

	p = p.replace(/^[\/.\s]+/, '')
	p = p.replace(KIND_PREFIX, '')
	p = p.replace(/^[\/.\s]+/, '')
	p = p.replace(/[.\s]+/g, '/')
	p = p.replace(/\/+/g, '/')
	p = p.replace(/^\/+|\/+$/g, '')
	return p
}

export function pathToVariableId(kind: XapiKind, path: string): string {
	const id = path.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
	return `${kind}_${id}`
}

export function stringifyXapiValue(value: unknown): string {
	if (value === undefined || value === null) return ''
	if (typeof value === 'string') return value
	if (typeof value === 'number' || typeof value === 'boolean') return String(value)
	try {
		return JSON.stringify(value)
	} catch {
		return String(value)
	}
}

export function jsonXapiValue(value: unknown): string {
	try {
		return JSON.stringify(value ?? null)
	} catch {
		return 'null'
	}
}

export function subscriptionKey(kind: XapiKind, path: string): string {
	return `${kind}:${path}`
}
