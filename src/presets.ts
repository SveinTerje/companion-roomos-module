import { CompanionPresetDefinitions, CompanionPresetSection, combineRgb } from '@companion-module/base'
import { ActionId } from './actions.js'
import { FeedbackId } from './feedback.js'
import type { RoomOSTypes } from './roomos.js'

export function GetPresetsList(): {
	structure: CompanionPresetSection<RoomOSTypes>[]
	presets: CompanionPresetDefinitions<RoomOSTypes>
} {
	const presets: CompanionPresetDefinitions<RoomOSTypes> = {}

	presets['general_dial'] = {
		type: 'simple',
		
		name: `Dial`,
		style: {
			text: `Dial`,
			size: '18',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 0),
		},
		feedbacks: [
			{
				feedbackId: FeedbackId.HasOutgoingCall,
				options: {
					bg: combineRgb(0, 255, 0),
					fg: combineRgb(0, 0, 0),
				},
			},
		],
		steps: [
			{
				down: [
					{
						actionId: ActionId.Dial,
						options: {
							number: '',
						},
					},
				],
				up: [],
			},
		],
	}
	presets['audio_volume'] = {
		type: 'simple',
		
		name: `Audio volume`,
		style: {
			text: `Audio volume`,
			size: '18',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 0),
		},
		feedbacks: [],
		steps: [
			{
				down: [
					{
						actionId: ActionId.Volume,
						options: {
							volume: 80,
						},
					},
				],
				up: [],
			},
		],
	}
	presets['audio_mic_mute'] = {
		type: 'simple',
		
		name: `Microphone mute`,
		style: {
			text: `Microphone mute`,
			size: '18',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 0),
		},
		feedbacks: [
			{
				feedbackId: FeedbackId.MicrophoneMute,
				options: {
					bg: combineRgb(255, 0, 0),
					fg: combineRgb(255, 255, 255),
				},
			},
		],
		steps: [
			{
				down: [
					{
						actionId: ActionId.MicrophoneMute,
						options: {
							Mute: 'On',
						},
					},
				],
				up: [],
			},
		],
	}
	presets['general_accept_all_calls'] = {
		type: 'simple',
		
		name: `Accept all calls`,
		style: {
			text: `Accept call`,
			size: '18',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 0),
		},
		feedbacks: [],
		steps: [
			{
				down: [
					{
						actionId: ActionId.Accept,
						options: {},
					},
				],
				up: [],
			},
		],
	}
	presets['general_disconnect'] = {
		type: 'simple',
		
		name: `Disconnect`,
		style: {
			text: `Disconnect`,
			size: '7',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 0),
		},
		feedbacks: [],
		steps: [
			{
				down: [
					{
						actionId: ActionId.Disconnect,
						options: {
							CallId: 0,
						},
					},
				],
				up: [],
			},
		],
	}
	presets['general_auto_answer'] = {
		type: 'simple',
		
		name: `Auto-answer mode`,
		style: {
			text: `Auto\\nanswer`,
			size: '18',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 0),
		},
		feedbacks: [
			{
				feedbackId: FeedbackId.AutoAnswer,
				options: {
					bg: combineRgb(255, 255, 255),
					fg: combineRgb(0, 0, 0),
				},
			},
		],
		steps: [
			{
				down: [
					{
						actionId: ActionId.AutoAnswerMode,
						options: {
							Mode: 'On',
						},
					},
				],
				up: [],
			},
		],
	}
	presets['visual_show_ingoing_calls'] = {
		type: 'simple',
		
		name: `Show active ingoing calls`,
		style: {
			text: `Ingoing\\ncall`,
			size: '14',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 0),
		},
		feedbacks: [
			{
				feedbackId: FeedbackId.HasIngoingCall,
				options: {
					bg: combineRgb(0, 255, 0),
					fg: combineRgb(0, 0, 0),
				},
			},
		],
		steps: [
			{
				down: [],
				up: [],
			},
		],
	}
	presets['visual_show_outgoing_calls'] = {
		type: 'simple',
		
		name: `Show active outgoing calls`,
		style: {
			text: `Outgoing\\ncall`,
			size: '14',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 0),
		},
		feedbacks: [
			{
				feedbackId: FeedbackId.HasOutgoingCall,
				options: {
					bg: combineRgb(0, 255, 0),
					fg: combineRgb(0, 0, 0),
				},
			},
		],
		steps: [
			{
				down: [],
				up: [],
			},
		],
	}
	presets['visual_show_ingoing_ringing_calls'] = {
		type: 'simple',
		
		name: `Show ingoing ringing calls`,
		style: {
			text: `Ringing`,
			size: '14',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 0),
		},
		feedbacks: [
			{
				feedbackId: FeedbackId.Ringing,
				options: {
					bg: combineRgb(0, 255, 0),
					fg: combineRgb(0, 0, 0),
				},
			},
		],
		steps: [
			{
				down: [],
				up: [],
			},
		],
	}
	presets['visual_software_version'] = {
		type: 'simple',
		
		name: 'Show software version',
		style: {
			text: 'SW\\n$(SystemUnit_Software_Version)',
			size: '14',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 0),
		},
		feedbacks: [],
		steps: [
			{
				down: [],
				up: [],
			},
		],
	}
	presets['visual_active_calls'] = {
		type: 'simple',
		
		name: 'Show number of active calls',
		style: {
			text: 'Calls\\n$(number_of_active_calls)',
			size: '14',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 0),
		},
		feedbacks: [],
		steps: [
			{
				down: [],
				up: [],
			},
		],
	}
	presets['subscribe_xstatus'] = {
		type: 'simple',
		
		name: 'Subscribe xStatus',
		style: {
			text: 'Sub\\nxStatus',
			size: '14',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 80, 0),
		},
		feedbacks: [],
		steps: [
			{
				down: [
					{
						actionId: ActionId.SubscribeStatus,
						options: {
							standard: 'SystemUnit/Software/Version',
							path: '',
						},
					},
				],
				up: [],
			},
		],
	}
	presets['subscribe_xevent'] = {
		type: 'simple',
		
		name: 'Subscribe xEvent',
		style: {
			text: 'Sub\\nxEvent',
			size: '14',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 80, 0),
		},
		feedbacks: [],
		steps: [
			{
				down: [
					{
						actionId: ActionId.SubscribeEvent,
						options: {
							path: 'CallDisconnect',
						},
					},
				],
				up: [],
			},
		],
	}
	presets['custom-xconfig'] = {
		type: 'simple',
		
		name: `Custom xConfiguration`,
		style: {
			text: 'custom\\nxConfiguration',
			size: '18',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 0),
		},
		feedbacks: [],
		steps: [
			{
				down: [
					{
						actionId: ActionId.CustomConfiguration,
						options: {
							path: 'Conference AutoAnswer Mode',
							Value: 'On',
						},
					},
				],
				up: [],
			},
		],
	}
	presets['custom_xcommand'] = {
		type: 'simple',
		
		name: `Custom xCommand`,
		style: {
			text: 'custom\\nxCommand',
			size: '18',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 0),
		},
		feedbacks: [],
		steps: [
			{
				down: [
					{
						actionId: ActionId.CustomCommand,
						options: {
							Method: 'Dial',
							Params: '{"Number":"123456789@meet24.webex.com"}',
						},
					},
				],
				up: [],
			},
		],
	}
	presets['osd_key_click'] = {
		type: 'simple',
		
		name: `OSD Key Click`,
		style: {
			text: 'OSD Click',
			size: '18',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 0),
		},
		feedbacks: [],
		steps: [
			{
				down: [
					{
						actionId: ActionId.OSDKeyClick,
						options: {},
					},
				],
				up: [],
			},
		],
	}
	presets['osd_key_press'] = {
		type: 'simple',
		
		name: `OSD Key Press`,
		style: {
			text: 'OSD Press',
			size: '18',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 0),
		},
		feedbacks: [],
		steps: [
			{
				down: [
					{
						actionId: ActionId.OSDKeyPress,
						options: {},
					},
				],
				up: [],
			},
		],
	}
	presets['osd_key_release'] = {
		type: 'simple',
		
		name: `OSD Key Release`,
		style: {
			text: 'OSD Release',
			size: '18',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 0),
		},
		feedbacks: [],
		steps: [
			{
				down: [
					{
						actionId: ActionId.OSDKeyRelease,
						options: {},
					},
				],
				up: [],
			},
		],
	}

	const structure: CompanionPresetSection[] = [
		{
			id: 'general',
			name: 'General functions',
			definitions: ['general_dial', 'general_accept_all_calls', 'general_disconnect', 'general_auto_answer'],
		},
		{
			id: 'audio',
			name: 'Audio',
			definitions: ['audio_volume', 'audio_mic_mute'],
		},
		{
			id: 'visual',
			name: 'Visual buttons',
			definitions: [
				'visual_show_ingoing_calls',
				'visual_show_outgoing_calls',
				'visual_show_ingoing_ringing_calls',
				'visual_software_version',
				'visual_active_calls',
			],
		},
		{
			id: 'xapi',
			name: 'xAPI subscriptions',
			definitions: ['subscribe_xstatus', 'subscribe_xevent'],
		},
		{
			id: 'custom',
			name: 'Custom',
			definitions: ['custom-xconfig', 'custom_xcommand'],
		},
		{
			id: 'osd',
			name: 'OSD',
			definitions: ['osd_key_click', 'osd_key_press', 'osd_key_release'],
		},
	]

	return { structure, presets }
}
