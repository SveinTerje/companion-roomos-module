import {
	lookupMainVideoSourceName,
	normalizeXapiPath,
	parseVideoInputConnectorNames,
	pathToVariableId,
} from './xapi-path.js'
import {
	describeSubscriptionMapping,
	findStandardConfig,
	findStandardStatus,
	statusVariableId,
} from './standard-status.js'
import { formatXapiError, isTransportFailure, subscribeParamsWithCurrentValue } from './xapi-rpc.js'

const normalizeCases: Array<[string, string]> = [
	['Audio Volume', 'Audio/Volume'],
	['xStatus Audio Volume', 'Audio/Volume'],
	['Status.Audio.Volume', 'Audio/Volume'],
	['/Status/Audio/Volume', 'Audio/Volume'],
	['SystemUnit State NumberOfActiveCalls', 'SystemUnit/State/NumberOfActiveCalls'],
	['xStatus SystemUnit State NumberOfActiveCalls', 'SystemUnit/State/NumberOfActiveCalls'],
	['CallDisconnect', 'CallDisconnect'],
	['xEvent CallDisconnect', 'CallDisconnect'],
	['Event.UserInterface.Extensions.Widget.Action', 'UserInterface/Extensions/Widget/Action'],
	['  Audio/Volume  ', 'Audio/Volume'],
]

let failed = 0
for (const [input, expected] of normalizeCases) {
	const got = normalizeXapiPath(input)
	if (got !== expected) {
		console.error(`normalizeXapiPath(${JSON.stringify(input)}) => ${JSON.stringify(got)}, expected ${JSON.stringify(expected)}`)
		failed++
	}
}

const id = pathToVariableId('status', 'Audio/Volume')
if (id !== 'status_Audio_Volume') {
	console.error(`pathToVariableId => ${id}, expected status_Audio_Volume`)
	failed++
}

const eventId = pathToVariableId('event', 'CallDisconnect')
if (eventId !== 'event_CallDisconnect') {
	console.error(`pathToVariableId => ${eventId}, expected event_CallDisconnect`)
	failed++
}

const subscribeParams = subscribeParamsWithCurrentValue('xFeedback/Subscribe', { Query: ['Status', 'Audio'] })
if (
	typeof subscribeParams !== 'object' ||
	subscribeParams == null ||
	(subscribeParams as { NotifyCurrentValue?: unknown }).NotifyCurrentValue !== true
) {
	console.error('subscribeParamsWithCurrentValue did not set NotifyCurrentValue')
	failed++
}
const getParams = { Path: ['Status', 'Audio'] }
if (subscribeParamsWithCurrentValue('xGet', getParams) !== getParams) {
	console.error('subscribeParamsWithCurrentValue must not alter xGet')
	failed++
}

if (formatXapiError({ code: 502, message: 'Bad Gateway' }) !== 'code 502: Bad Gateway') {
	console.error(`formatXapiError object => ${formatXapiError({ code: 502, message: 'Bad Gateway' })}`)
	failed++
}
if (!isTransportFailure(new Error('Unexpected server response: 502'))) {
	console.error('handshake 502 should be a transport failure')
	failed++
}
if (isTransportFailure({ code: 1, message: 'Command Error' })) {
	console.error('xAPI command error should not be treated as transport failure')
	failed++
}
if (isTransportFailure({ code: -32603, message: 'Internal Error' })) {
	console.error('JSON-RPC internal error should not be treated as transport failure')
	failed++
}

const versionId = statusVariableId('xStatus SystemUnit Software Version')
if (versionId.path !== 'SystemUnit/Software/Version' || versionId.variableId !== 'SystemUnit_Software_Version') {
	console.error(`statusVariableId software version => ${JSON.stringify(versionId)}`)
	failed++
}
if (!findStandardStatus('SystemUnit/Software/Version')) {
	console.error('SystemUnit/Software/Version should be a standard status')
	failed++
}
const customId = statusVariableId('Standby State')
if (customId.variableId !== 'status_Standby_State') {
	console.error(`custom statusVariableId => ${customId.variableId}`)
	failed++
}

if (normalizeXapiPath('xConfiguration UserInterface OSD Mode') !== 'UserInterface/OSD/Mode') {
	console.error('OSD Mode path should normalize from xConfiguration form')
	failed++
}
if (!findStandardStatus('Audio Volume') || findStandardStatus('Audio Volume')?.variableId !== 'volume') {
	console.error('Audio Volume should map to volume')
	failed++
}
if (!findStandardStatus('Video Input MainVideoSource')) {
	console.error('Video Input MainVideoSource should be a standard status')
	failed++
}
if (!findStandardConfig('UserInterface OSD Mode')) {
	console.error('UserInterface OSD Mode should be a standard config')
	failed++
}

const mapped = describeSubscriptionMapping('status', 'Video/Input/MainVideoSource', 'MainVideoSource')
if (!mapped.includes('main_video_source_name') || !mapped.includes('Connector')) {
	console.error(`MainVideoSource mapping description => ${mapped}`)
	failed++
}

const names = parseVideoInputConnectorNames({
	1: { Name: 'Camera 1' },
	2: { Name: 'PC' },
})
if (names['1'] !== 'Camera 1' || names['2'] !== 'PC') {
	console.error(`parseVideoInputConnectorNames map => ${JSON.stringify(names)}`)
	failed++
}
const namesArr = parseVideoInputConnectorNames([
	{ id: 3, Name: 'HDMI' },
	{ ConnectorId: 4, Name: 'USB-C' },
])
if (namesArr['3'] !== 'HDMI' || namesArr['4'] !== 'USB-C') {
	console.error(`parseVideoInputConnectorNames array => ${JSON.stringify(namesArr)}`)
	failed++
}
if (lookupMainVideoSourceName('2', names) !== 'PC') {
	console.error('lookupMainVideoSourceName should use Connector Name')
	failed++
}
if (lookupMainVideoSourceName('Composed', names) !== 'Composed') {
	console.error('Composed main source should stay Composed')
	failed++
}
if (lookupMainVideoSourceName('9', names) !== '9') {
	console.error('unknown connector id should fall back to the id')
	failed++
}

if (failed) {
	process.exit(1)
}
console.log(`xapi-path selftest: ${normalizeCases.length + 2 + 8 + 11} checks ok`)
