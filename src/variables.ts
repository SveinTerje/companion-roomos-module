import { CompanionVariableDefinition } from '@companion-module/base'
import { RoomOSInstanceBase } from './roomos.js'
import { standardInitialValues, standardVariableDefinitions } from './standard-status.js'

export function GetSessionVariableDefinitions(): Record<string, CompanionVariableDefinition> {
	return {
		xfeedback_count: { name: 'Number of xFeedback expressions on this connection' },
		event_last_path: { name: 'Last xEvent path' },
		event_last_value: { name: 'Last xEvent value' },
		event_last_json: { name: 'Last xEvent JSON payload' },
		event_last_time: { name: 'Last xEvent timestamp' },
		event_last_count: { name: 'Last xEvent sequence (use for Companion variable-changed triggers)' },
	}
}

export function SetVariableDefinitions(instance: RoomOSInstanceBase): void {
	const extra = instance.subscriptions ? instance.subscriptions.variableDefinitions() : {}
	instance.setVariableDefinitions({
		...GetSessionVariableDefinitions(),
		...standardVariableDefinitions(),
		...extra,
	})
}

export function InitVariables(instance: RoomOSInstanceBase): void {
	SetVariableDefinitions(instance)
	instance.setVariableValues({
		xfeedback_count: '0',
		event_last_path: '',
		event_last_value: '',
		event_last_json: '',
		event_last_time: '',
		event_last_count: '0',
		...standardInitialValues(),
	})
}
