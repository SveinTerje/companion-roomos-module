export type XapiKind = 'status' | 'event' | 'config'

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

/**
 * Extract Connector[i].Name entries from an xConfiguration Video Input Connector
 * payload. jsxapi may deliver an array of `{ id, Name }` objects or a map keyed
 * by connector index.
 */
export function parseVideoInputConnectorNames(value: unknown): Record<string, string> {
	const names: Record<string, string> = {}
	if (value == null || typeof value !== 'object') return names

	const take = (id: unknown, rec: Record<string, unknown>): void => {
		if (id == null || id === '') return
		if (rec.Name == null || rec.Name === '') return
		names[String(id)] = String(rec.Name)
	}

	if (Array.isArray(value)) {
		for (const item of value) {
			if (!item || typeof item !== 'object') continue
			const rec = item as Record<string, unknown>
			take(rec.id ?? rec.ConnectorId, rec)
		}
		return names
	}

	for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
		if (!item || typeof item !== 'object') continue
		const rec = item as Record<string, unknown>
		take(rec.id ?? rec.ConnectorId ?? key, rec)
	}
	return names
}

export function lookupMainVideoSourceName(id: string, names: Record<string, string>): string {
	if (!id) return ''
	if (id === 'Composed') return 'Composed'
	return names[id] || names[String(Number(id))] || id
}
