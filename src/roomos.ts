import { InstanceBase, InstanceTypes } from '@companion-module/base'
import { XAPI } from 'jsxapi'
import type { DeviceConfig } from './config.js'
import type { SubscriptionManager } from './subscriptions.js'

interface Connector {
	id: string
	Mute: string
}

export enum RoomOSBoolean {
	True = 'True',
	False = 'False',
}

export enum RoomOSOnOffBoolean {
	On = 'On',
	Off = 'Off',
	Unknown = '',
}

export interface RoomOSConfigAutoAnswer {
	Delay: string
	Mode: RoomOSOnOffBoolean
	Mute: RoomOSOnOffBoolean
}

export interface WebexMessage {
	id: string
	result: { CallId: string; Mode: string; Delay: string; Mute: string }
}
export interface WebexCall {
	id: string
	AnswerState: string // 'Unanswered' | 'Answered'
	CallType: string
	CallbackNumber: string
	DeviceType: string
	Direction: 'Incoming' | 'Outgoing'
	DisplayName: string
	Duration: string
	Encryption: unknown
	PlacedOnHold?: RoomOSBoolean
	Protocol: string
	ReceiveCallRate: string
	RemoteNumber: string
	Status: 'Dialling' | 'Connected' | 'Ringing'
	TransmitCallRate: string
	ghost?: RoomOSBoolean
	Ice: string
}

export interface RoomOSTypes extends InstanceTypes {
	config: DeviceConfig
	secrets: undefined
}

export abstract class RoomOSInstanceBase extends InstanceBase<RoomOSTypes> {
	public xapi?: XAPI
	public subscriptions!: SubscriptionManager
	public CallId!: string
	public ongoingCalls: WebexCall[] = []
	public connectorMute: Connector[] = []
	public hasIngoingCall = false
	public hasRingingCall = false
	public hasOutgoingCall = false
	public microphoneMute = false
	public autoAnswerConfig: RoomOSConfigAutoAnswer = {
		Delay: '',
		Mode: RoomOSOnOffBoolean.Unknown,
		Mute: RoomOSOnOffBoolean.Unknown,
	}
}
