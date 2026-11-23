import { JsonObject, Regex, SomeCompanionConfigField } from '@companion-module/base'

export type DeviceConfig = JsonObject & {
	host: string
	username: string
	password: string
	protocol: string
}

export function GetConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'static-text',
			id: 'info',
			width: 12,
			label: 'Note',
			value:
				'This module is for connecting to Cisco RoomOS hardware like Room, Board and Desk series, DX80, Codec Pro, etc. WebSocket requires HTTP or HTTPS enabled and xConfiguration NetworkServices Websocket: FollowHTTPService.',
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'Device Host/IP',
			width: 12,
			regex: Regex.IP,
			default: '',
		},
		{
			type: 'textinput',
			id: 'username',
			label: 'Username',
			width: 6,
			regex: Regex.SOMETHING,
			default: '',
		},
		{
			type: 'textinput',
			id: 'password',
			label: 'Password',
			width: 6,
			default: '',
		},
		{
			type: 'dropdown',
			id: 'protocol',
			label: 'Connection protocol',
			width: 6,
			choices: [
				{ id: 'wss', label: 'Websocket' },
				{ id: 'ssh', label: 'ssh' },
			],
			default: 'wss',
		},
	]
}
