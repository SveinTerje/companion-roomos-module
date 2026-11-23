import { CompanionVariableDefinition } from '@companion-module/base'
import { RoomOSInstanceBase } from './roomos.js'

export function GetBuiltinVariableDefinitions(): Record<string, CompanionVariableDefinition> {
	return {
		outgoing_calls: { name: `Number of outgoing calls` },
		ingoing_calls: { name: `Number of ingoing calls` },
		ingoing_ringing_calls: { name: `Number of ingoing actively ringing calls` },
		autoanswer_mode: { name: `Auto answer activated` },
		autoanswer_mute: { name: `Incoming call will be muted (on)` },
		autoanswer_delay: { name: `Autoanswer delay` },
		systemtime: { name: `System Time on connection` },
		selected_device: { name: 'Audio: Selected device' },
		volume: { name: 'Audio: Volume' },
		microphones_musicmode: { name: 'Audio: Microphones Music Mode' },
		microphones_mute: { name: 'Audio: Microphones Mute' },
		audio_connector_mute: { name: 'Audio: connectors mute' },
		DoNotDisturb: { name: 'Conference: Do not disturb' },
		Presentation: { name: 'Conference: Presentation' },
		SelectedCallProtocol: { name: 'Conference: SelectedCallProtocol' },
		number_of_active_calls: { name: 'SystemUnit: Number of active calls' },
	}
}

export function SetVariableDefinitions(instance: RoomOSInstanceBase): void {
	const extra = instance.subscriptions ? instance.subscriptions.variableDefinitions() : {}
	instance.setVariableDefinitions({ ...GetBuiltinVariableDefinitions(), ...extra })
}

export function InitVariables(instance: RoomOSInstanceBase): void {
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
