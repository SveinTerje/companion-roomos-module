import {
	CompanionAdvancedFeedbackResult,
	CompanionFeedbackAdvancedEvent,
	CompanionFeedbackDefinitions,
	CompanionInputFieldColor,
	CompanionVariableValues,
	combineRgb,
} from '@companion-module/base'
import { WebexCall, RoomOSInstanceBase, RoomOSOnOffBoolean, RoomOSBoolean } from './roomos.js'
import { stringifyXapiValue } from './xapi-path.js'

export enum FeedbackId {
	Ringing = 'ringing',
	HasIngoingCall = 'hasingoingcall',
	HasOutgoingCall = 'hasoutgoingcall',
	AutoAnswer = 'autoanswer',
	MicrophoneMute = 'microphonemute',
}

export function ForegroundPicker(color: number): CompanionInputFieldColor {
	return {
		type: 'colorpicker',
		label: 'Foreground color',
		id: 'fg',
		default: color,
	}
}
export function BackgroundPicker(color: number): CompanionInputFieldColor {
	return {
		type: 'colorpicker',
		label: 'Background color',
		id: 'bg',
		default: color,
	}
}
export function HandleXAPICall(instance: RoomOSInstanceBase, call: WebexCall): void {
	if (call.ghost === RoomOSBoolean.True) {
		instance.ongoingCalls = instance.ongoingCalls.filter((existingCall) => existingCall.id !== call.id)
	} else {
		const existingCall = instance.ongoingCalls.find((existingCall) => existingCall.id === call.id)

		if (existingCall !== undefined) {
			instance.ongoingCalls = instance.ongoingCalls.map((existingCall) =>
				existingCall.id === call.id ? { ...existingCall, ...call } : { ...existingCall }
			)
		} else {
			instance.ongoingCalls = [...instance.ongoingCalls, call]
		}
	}
	console.log('DEBUG: CALLS: ', instance.ongoingCalls)
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function HandleXAPIConfFeedback(instance: RoomOSInstanceBase, event: any): void {
	console.log('RoomOS CONFIG: ', instance.id, event)

	if (event.Conference?.AutoAnswer) {
		if (event.Conference?.AutoAnswer?.Mode) {
			if (instance.autoAnswerConfig.Mode !== event.Conference?.AutoAnswer?.Mode) {
				instance.autoAnswerConfig.Mode = event.Conference?.AutoAnswer?.Mode
				instance.checkFeedbacks(FeedbackId.AutoAnswer)
			}
		}
		instance.autoAnswerConfig = {
			...instance.autoAnswerConfig,
			...event.Conference?.AutoAnswer,
		}
	}
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function HandleXAPIFeedback(instance: RoomOSInstanceBase, event: any): void {
	// console.log('RoomOS EVENT: ', instance.id, event)

	const newValues: CompanionVariableValues = {}
	const checkFeedbacks: FeedbackId[] = []

	if (event.Audio) {
		if (
			event.Audio.Input != undefined &&
			event.Audio.Input.Connectors != undefined &&
			event.Audio.Input.Connectors.Microphone != undefined
		) {
			let muteState = ''
			for (let index = 0; index < event.Audio.Input.Connectors.Microphone.length; index++) {
				const element = event.Audio.Input.Connectors.Microphone[index]
				muteState += `(Mic ${element.id} Mute: ${element.Mute})`
				instance.connectorMute[element.id] = element.Mute
			}
			newValues['audio_connector_mute'] = muteState
		}
		if (event.Audio.Microphones != undefined && event.Audio.Microphones.Mute != undefined) {
			newValues['microphones_mute'] = event.Audio.Microphones.Mute
			instance.microphoneMute = event.Audio.Microphones.Mute == 'On' ? true : false
			checkFeedbacks.push(FeedbackId.MicrophoneMute)
		}
	}

	if (event.Call) {
		event.Call.forEach((call: WebexCall) => HandleXAPICall(instance, call))
		const currentlyRingingCalls = instance.ongoingCalls.filter(
			(call) => call.Direction === 'Incoming' && call.Status === 'Ringing'
		)
		const currentlyIngoingCalls = instance.ongoingCalls.filter((call) => call.Direction === 'Incoming')
		const currentlyOutgoingCalls = instance.ongoingCalls.filter((call) => call.Direction === 'Outgoing')

		const currentlyHasRingingCalls = currentlyRingingCalls.length > 0
		const currentlyHasIngoingCalls = currentlyIngoingCalls.length > 0
		const currentlyHasOutgoingCalls = currentlyOutgoingCalls.length > 0

		if (currentlyHasRingingCalls !== instance.hasRingingCall) {
			instance.hasRingingCall = currentlyHasRingingCalls
			checkFeedbacks.push(FeedbackId.Ringing)
		}

		if (currentlyHasIngoingCalls !== instance.hasIngoingCall) {
			instance.hasIngoingCall = currentlyHasIngoingCalls
			checkFeedbacks.push(FeedbackId.HasIngoingCall)
		}

		if (currentlyHasOutgoingCalls !== instance.hasOutgoingCall) {
			instance.hasOutgoingCall = currentlyHasOutgoingCalls
			checkFeedbacks.push(FeedbackId.HasOutgoingCall)
		}
	}

	if (event.Conference) {
		if (event.Conference.Presentation != null) {
			newValues['Presentation'] = stringifyXapiValue(event.Conference.Presentation)
		}
	}

	if (event.Time?.SystemTime != null) {
		newValues['systemtime'] = stringifyXapiValue(event.Time.SystemTime)
	}

	instance.setVariableValues(newValues)
	if (checkFeedbacks.length > 0) {
		instance.checkFeedbacks(checkFeedbacks[0], ...checkFeedbacks.slice(1))
	}
}

export function GetFeedbacksList(instance: RoomOSInstanceBase): CompanionFeedbackDefinitions {
	const feedbacks: CompanionFeedbackDefinitions = {}

	const getOptColors = (feedback: CompanionFeedbackAdvancedEvent): CompanionAdvancedFeedbackResult => ({
		color: Number(feedback.options.fg),
		bgcolor: Number(feedback.options.bg),
	})

	feedbacks[FeedbackId.Ringing] = {
		type: 'advanced',
		name: 'Change colors if device is ringing',
		description: 'If the device is has a ingoing call, change colors of the bank',
		options: [ForegroundPicker(combineRgb(0, 0, 0)), BackgroundPicker(combineRgb(255, 255, 0))],
		affectedProperties: ['bgcolor', 'color'],
		callback: (feedback): CompanionAdvancedFeedbackResult => {
			if (instance.hasRingingCall) {
				return getOptColors(feedback)
			}
			return {}
		},
	}

	feedbacks[FeedbackId.HasIngoingCall] = {
		type: 'advanced',
		name: 'Change colors if device has ingoing calls',
		description: 'If the device is has any calls in ingoing direction, change colors of the bank',
		options: [ForegroundPicker(combineRgb(0, 0, 0)), BackgroundPicker(combineRgb(0, 255, 0))],
		affectedProperties: ['bgcolor', 'color'],
		callback: (feedback): CompanionAdvancedFeedbackResult => {
			if (instance.hasIngoingCall) {
				return getOptColors(feedback)
			}
			return {}
		},
	}

	feedbacks[FeedbackId.HasOutgoingCall] = {
		type: 'advanced',
		name: 'Change colors if device has outgoing calls',
		description: 'If the device is has any calls in outgoing direction, change colors of the bank',
		options: [ForegroundPicker(combineRgb(0, 0, 0)), BackgroundPicker(combineRgb(0, 255, 0))],
		affectedProperties: ['bgcolor', 'color'],
		callback: (feedback): CompanionAdvancedFeedbackResult => {
			if (instance.hasOutgoingCall) {
				return getOptColors(feedback)
			}
			return {}
		},
	}

	feedbacks[FeedbackId.AutoAnswer] = {
		type: 'advanced',
		name: 'Change colors if device is set to auto-answer calls',
		description: 'If the device is set to auto-answer, change colors of the bank',
		options: [ForegroundPicker(combineRgb(0, 0, 0)), BackgroundPicker(combineRgb(255, 255, 255))],
		affectedProperties: ['bgcolor', 'color'],
		callback: (feedback): CompanionAdvancedFeedbackResult => {
			if (instance.autoAnswerConfig.Mode === RoomOSOnOffBoolean.On) {
				return getOptColors(feedback)
			}
			return {}
		},
	}

	feedbacks[FeedbackId.MicrophoneMute] = {
		type: 'advanced',
		name: 'Change colors if microphone is set mute',
		description: 'If the microphone is set mute, change colors of the bank',
		options: [ForegroundPicker(combineRgb(0, 0, 0)), BackgroundPicker(combineRgb(255, 0, 0))],
		affectedProperties: ['bgcolor', 'color'],
		callback: (feedback): CompanionAdvancedFeedbackResult => {
			if (instance.microphoneMute) {
				return getOptColors(feedback)
			}
			return {}
		},
	}

	return feedbacks
}
