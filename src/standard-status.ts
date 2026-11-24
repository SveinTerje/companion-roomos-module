import { CompanionVariableDefinition } from '@companion-module/base'
import { XapiKind, normalizeXapiPath, pathToVariableId } from './xapi-path.js'

export interface StandardStatus {
	path: string
	variableId: string
	name: string
}

export const MAIN_VIDEO_SOURCE_PATH = 'Video/Input/MainVideoSource'
export const VIDEO_INPUT_CONNECTOR_CONFIG_PATH = 'Video/Input/Connector'
export const OSD_MODE_PATH = 'UserInterface/OSD/Mode'
export const MAIN_VIDEO_SOURCE_NAME_VARIABLE = 'main_video_source_name'

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
		path: 'Audio/Volume',
		variableId: 'volume',
		name: 'Audio Volume',
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
	{
		path: MAIN_VIDEO_SOURCE_PATH,
		variableId: 'MainVideoSource',
		name: 'Video Input MainVideoSource',
	},
]

/**
 * Predefined xConfiguration paths. Same activation rule as standard xStatus:
 * the variable is assignable immediately; xFeedback is registered only after
 * Subscribe (or an action such as OSD Mode that activates the path).
 */
export const STANDARD_CONFIG_SUBSCRIPTIONS: StandardStatus[] = [
	{
		path: OSD_MODE_PATH,
		variableId: 'osd_mode',
		name: 'UserInterface OSD Mode',
	},
]

export const SUBSCRIPTION_MAPPING_DESCRIPTION =
	'Each subscription maps to Companion variables from its normalized xAPI path. ' +
	'Standard catalog paths keep the names in the Status list. Custom xStatus becomes status_<path> ' +
	'(slashes to underscores). xEvent becomes event_<path>, plus _json, _time, and _count ' +
	'(use _count for variable-changed triggers). xConfiguration becomes config_<path> unless it is a catalog item. ' +
	'Video Input MainVideoSource also fills main_video_source_name from xConfiguration Video Input Connector[id] Name.'

export function findStandardStatus(rawPath: string): StandardStatus | undefined {
	const path = normalizeXapiPath(rawPath)
	return STANDARD_STATUS_SUBSCRIPTIONS.find((s) => s.path === path)
}

export function findStandardConfig(rawPath: string): StandardStatus | undefined {
	const path = normalizeXapiPath(rawPath)
	return STANDARD_CONFIG_SUBSCRIPTIONS.find((s) => s.path === path)
}

export function statusVariableId(rawPath: string): { path: string; variableId: string } | { path: ''; variableId: '' } {
	const path = normalizeXapiPath(rawPath)
	if (!path) return { path: '', variableId: '' }
	const standard = STANDARD_STATUS_SUBSCRIPTIONS.find((s) => s.path === path)
	return { path, variableId: standard ? standard.variableId : pathToVariableId('status', path) }
}

export function configVariableId(rawPath: string): { path: string; variableId: string } | { path: ''; variableId: '' } {
	const path = normalizeXapiPath(rawPath)
	if (!path) return { path: '', variableId: '' }
	const standard = STANDARD_CONFIG_SUBSCRIPTIONS.find((s) => s.path === path)
	return { path, variableId: standard ? standard.variableId : pathToVariableId('config', path) }
}

export function describeSubscriptionMapping(kind: XapiKind, path: string, variableId: string): string {
	if (kind === 'event') {
		return `variables ${variableId}, ${variableId}_json, ${variableId}_time, ${variableId}_count (trigger on _count)`
	}
	if (path === MAIN_VIDEO_SOURCE_PATH) {
		return `variable ${variableId} (connector id) and ${MAIN_VIDEO_SOURCE_NAME_VARIABLE} (xConfiguration Video Input Connector[id] Name)`
	}
	if (kind === 'config') {
		return `variable ${variableId} (xConfiguration)`
	}
	return `variable ${variableId}`
}

export function standardVariableDefinitions(): Record<string, CompanionVariableDefinition> {
	const defs: Record<string, CompanionVariableDefinition> = {}
	for (const s of STANDARD_STATUS_SUBSCRIPTIONS) {
		defs[s.variableId] = { name: `${s.name} (activate with xStatus: Subscribe)` }
	}
	for (const s of STANDARD_CONFIG_SUBSCRIPTIONS) {
		defs[s.variableId] = { name: `${s.name} (activate with xStatus: Subscribe or OSD Mode)` }
	}
	defs[MAIN_VIDEO_SOURCE_NAME_VARIABLE] = {
		name: 'Main video source connector name (from Video Input Connector[id] Name; activate MainVideoSource subscribe)',
	}
	return defs
}

export function standardInitialValues(): Record<string, string> {
	const values: Record<string, string> = {}
	for (const s of STANDARD_STATUS_SUBSCRIPTIONS) values[s.variableId] = ''
	for (const s of STANDARD_CONFIG_SUBSCRIPTIONS) values[s.variableId] = ''
	values[MAIN_VIDEO_SOURCE_NAME_VARIABLE] = ''
	return values
}
