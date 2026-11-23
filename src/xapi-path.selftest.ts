import { normalizeXapiPath, pathToVariableId } from './xapi-path.js'
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

if (failed) {
	process.exit(1)
}
console.log(`xapi-path selftest: ${normalizeCases.length + 2 + 5} checks ok`)
