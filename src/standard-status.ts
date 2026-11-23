import { CompanionVariableDefinition } from '@companion-module/base'
import { normalizeXapiPath, pathToVariableId } from './xapi-path.js'

export interface StandardStatus {
	path: string
	variableId: string
	name: string
}

/**
 * Predefined xStatus paths. Companion can assign these variables immediately;
 * xFeedback is registered only after the Subscribe action activates the path.
 */
export const STANDARD_STATUS_SUBSCRIPTIONS: StandardStatus[] = [
	{
		path: 'SystemUnit/Software/Version',
		variableId: 'SystemUnit_Software_Version',
		name: 'SystemUnit Software Version',
	},
	{
		path: 'SystemUnit/State/NumberOfActiveCalls',
		variableId: 'number_of_active_calls',
		name: 'SystemUnit Number of active calls',
	},
	{
		path: 'Audio/Microphones/Mute',
		variableId: 'microphones_mute',
		name: 'Audio Microphones Mute',
	},
	{
		path: 'Audio/Input/Connectors/Microphone',
		variableId: 'audio_connector_mute',
		name: 'Audio connector mute',
	},
	{
		path: 'Time/SystemTime',
		variableId: 'systemtime',
		name: 'System Time',
	},
	{
		path: 'Conference/Presentation',
		variableId: 'Presentation',
		name: 'Conference Presentation',
	},
]

export function findStandardStatus(rawPath: string): StandardStatus | undefined {
	const path = normalizeXapiPath(rawPath)
	return STANDARD_STATUS_SUBSCRIPTIONS.find((s) => s.path === path)
}

export function statusVariableId(rawPath: string): { path: string; variableId: string } | { path: ''; variableId: '' } {
	const path = normalizeXapiPath(rawPath)
	if (!path) return { path: '', variableId: '' }
	const standard = STANDARD_STATUS_SUBSCRIPTIONS.find((s) => s.path === path)
	return { path, variableId: standard ? standard.variableId : pathToVariableId('status', path) }
}

export function standardVariableDefinitions(): Record<string, CompanionVariableDefinition> {
	const defs: Record<string, CompanionVariableDefinition> = {}
	for (const s of STANDARD_STATUS_SUBSCRIPTIONS) {
		defs[s.variableId] = { name: `${s.name} (activate with xStatus: Subscribe)` }
	}
	return defs
}
