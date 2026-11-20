import { normalizeXapiPath, pathToVariableId } from './xapi-path.js'

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

if (failed) {
	process.exit(1)
}
console.log(`xapi-path selftest: ${normalizeCases.length + 2} checks ok`)
