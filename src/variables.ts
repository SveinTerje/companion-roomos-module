import { CompanionVariableDefinition } from '@companion-module/base'
import { DeviceConfig } from './config.js'
import { RoomOSInstanceBase } from './roomos.js'

export function GetBuiltinVariableDefinitions(): CompanionVariableDefinition[] {
	const variables: CompanionVariableDefinition[] = []

	variables.push({
		name: `Number of outgoing calls`,
		variableId: `outgoing_calls`,
	})
	variables.push({
		name: `Number of ingoing calls`,
		variableId: `ingoing_calls`,
	})
	variables.push({
		name: `Number of ingoing actively ringing calls`,
		variableId: `ingoing_ringing_calls`,
	})
	variables.push({
		name: `Auto answer activated`,
		variableId: `autoanswer_mode`,
	})
	variables.push({
		name: `Incoming call will be muted (on)`,
		variableId: `autoanswer_mute`,
	})
	variables.push({
		name: `Autoanswer delay`,
		variableId: `autoanswer_delay`,
	})
	variables.push({
		name: `System Time on connection`,
		variableId: `systemtime`,
	})
	variables.push({
		name: 'Audio: Selected device',
		variableId: 'selected_device',
	})
	variables.push({
		name: 'Audio: Volume',
		variableId: 'volume',
	})
	variables.push({
		name: 'Audio: Microphones Music Mode',
		variableId: 'microphones_musicmode',
	})
	variables.push({
		name: 'Audio: Microphones Mute',
		variableId: 'microphones_mute',
	})
	variables.push({
		name: 'Audio: connectors mute',
		variableId: 'audio_connector_mute',
	})
	variables.push({
		name: 'Conference: Do not disturb',
		variableId: 'DoNotDisturb',
	})
	variables.push({
		name: 'Conference: Presentation',
		variableId: 'Presentation',
	})
	variables.push({
		name: 'Conference: SelectedCallProtocol',
		variableId: 'SelectedCallProtocol',
	})
	variables.push({
		name: 'SystemUnit: Number of active calls',
		variableId: 'number_of_active_calls',
	})

	return variables
}

export function SetVariableDefinitions(instance: RoomOSInstanceBase<DeviceConfig>): void {
	const extra = instance.subscriptions ? instance.subscriptions.variableDefinitions() : []
	instance.setVariableDefinitions([...GetBuiltinVariableDefinitions(), ...extra])
}

export function InitVariables(instance: RoomOSInstanceBase<DeviceConfig>): void {
	SetVariableDefinitions(instance)
	instance.setVariableValues({
		outgoing_calls: '0',
		ingoing_calls: '0',
		ingoing_ringing_calls: '0',
		number_of_active_calls: '0',
		xfeedback_count: '0',
		event_last_path: '',
		event_last_value: '',
		event_last_json: '',
		event_last_time: '',
		event_last_count: '0',
	})
}
