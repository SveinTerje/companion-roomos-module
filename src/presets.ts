import {
	CompanionPresetDefinitions,
	CompanionPresetSection,
	CompanionSimplePresetDefinition,
	CompanionTextSize,
	SomePresetActionEntry,
	SomePresetSimpleFeedbackEntry,
	combineRgb,
} from '@companion-module/base'
import { ActionId } from './actions.js'
import { FeedbackId } from './feedback.js'
import type { RoomOSTypes } from './roomos.js'

const WHITE = combineRgb(255, 255, 255)
const BLACK = combineRgb(0, 0, 0)
const GREEN = combineRgb(0, 80, 0)

function button(
	name: string,
	text: string,
	down: SomePresetActionEntry<RoomOSTypes>[] = [],
	extra?: {
		size?: CompanionTextSize
		bgcolor?: number
		feedbacks?: SomePresetSimpleFeedbackEntry<RoomOSTypes>[]
	}
): CompanionSimplePresetDefinition<RoomOSTypes> {
	return {
		type: 'simple',
		name,
		style: {
			text,
			size: extra?.size ?? '14',
			color: WHITE,
			bgcolor: extra?.bgcolor ?? BLACK,
		},
		feedbacks: extra?.feedbacks ?? [],
		steps: [
			{
				down,
				up: [],
			},
		],
	}
}

export function GetPresetsList(): {
	structure: CompanionPresetSection<RoomOSTypes>[]
	presets: CompanionPresetDefinitions<RoomOSTypes>
} {
	const presets: CompanionPresetDefinitions<RoomOSTypes> = {}

	presets['general_dial'] = button(
		'Dial',
		'Dial',
		[{ actionId: ActionId.Dial, options: { number: '' } }],
		{
			size: '18',
			feedbacks: [
				{
					feedbackId: FeedbackId.HasOutgoingCall,
					options: { bg: combineRgb(0, 255, 0), fg: BLACK },
				},
			],
		}
	)
	presets['general_accept_all_calls'] = button(
		'Accept all calls',
		'Accept call',
		[{ actionId: ActionId.Accept, options: {} }],
		{ size: '18' }
	)
	presets['general_disconnect'] = button(
		'Disconnect',
		'Disconnect',
		[{ actionId: ActionId.Disconnect, options: { CallId: 0 } }],
		{ size: '18' }
	)
	presets['general_dnd_on'] = button(
		'Do Not Disturb on',
		'DND\\nOn',
		[{ actionId: ActionId.ConferenceDoNotDisturbActivate, options: { Timeout: 60 } }]
	)
	presets['general_dnd_off'] = button(
		'Do Not Disturb off',
		'DND\\nOff',
		[{ actionId: ActionId.ConferenceDoNotDisturbDeActivate, options: {} }]
	)

	presets['audio_volume'] = button('Show audio volume', 'Vol\\n$(volume)')
	presets['audio_volume_up'] = button(
		'Volume up',
		'Vol\\n+',
		[{ actionId: ActionId.VolumeIncrease, options: { amount: 5 } }],
		{ bgcolor: GREEN }
	)
	presets['audio_volume_down'] = button(
		'Volume down',
		'Vol\\n-',
		[{ actionId: ActionId.VolumeDecrease, options: { amount: 5 } }],
		{ bgcolor: GREEN }
	)
	presets['audio_mic_mute'] = button(
		'Microphone mute',
		'Mic\\nMute',
		[{ actionId: ActionId.MicrophoneMute, options: { Mute: 'On' } }],
		{
			feedbacks: [
				{
					feedbackId: FeedbackId.MicrophoneMute,
					options: { bg: combineRgb(255, 0, 0), fg: WHITE },
				},
			],
		}
	)
	presets['audio_mic_unmute'] = button(
		'Microphone unmute',
		'Mic\\nUnmute',
		[{ actionId: ActionId.MicrophoneMute, options: { Mute: 'Off' } }],
		{
			feedbacks: [
				{
					feedbackId: FeedbackId.MicrophoneMute,
					options: { bg: combineRgb(255, 0, 0), fg: WHITE },
				},
			],
		}
	)
	presets['audio_mic_mute_toggle'] = button(
		'Microphone mute toggle',
		'Mic\\nToggle',
		[{ actionId: ActionId.MicrophoneMute, options: { Mute: 'Toggle' } }],
		{
			feedbacks: [
				{
					feedbackId: FeedbackId.MicrophoneMute,
					options: { bg: combineRgb(255, 0, 0), fg: WHITE },
				},
			],
		}
	)

	presets['visual_software_version'] = button('Show software version', 'SW\\n$(SystemUnit_Software_Version)')
	presets['visual_active_calls'] = button('Show number of active calls', 'Calls\\n$(number_of_active_calls)')
	presets['visual_main_video_source'] = button('Show main video source', 'Main\\n$(main_video_source_name)')

	presets['video_presentation_start'] = button(
		'Presentation start',
		'Pres\\nStart',
		[
			{
				actionId: ActionId.Presentation,
				options: {
					StartStop: 'Start',
					ConnectorId: 1,
					Instance: 'New',
					Layout: 'Equal',
					PresentationSource: '1',
					SendingMode: 'LocalRemote',
				},
			},
		]
	)
	presets['video_presentation_stop'] = button(
		'Presentation stop',
		'Pres\\nStop',
		[{ actionId: ActionId.Presentation, options: { StartStop: 'Stop', Instance: 'New' } }]
	)
	presets['video_selfview_on'] = button(
		'Self-view on',
		'Selfview\\nOn',
		[
			{
				actionId: ActionId.SelfView,
				options: { Mode: 'On', FullscreenMode: 'Off', PIPPosition: 'LowerRight', OnMonitorRole: 'First' },
			},
		]
	)
	presets['video_selfview_off'] = button(
		'Self-view off',
		'Selfview\\nOff',
		[
			{
				actionId: ActionId.SelfView,
				options: { Mode: 'Off', FullscreenMode: 'Off', PIPPosition: 'LowerRight', OnMonitorRole: 'First' },
			},
		]
	)
	presets['video_camera_preset'] = button(
		'Camera preset',
		'Cam\\nPreset 1',
		[{ actionId: ActionId.CameraPreset, options: { PresetId: 1 } }]
	)

	presets['subscribe_xstatus'] = button(
		'Subscribe xStatus',
		'Sub\\nxStatus',
		[{ actionId: ActionId.SubscribeStatus, options: { standard: 'SystemUnit/Software/Version', path: '' } }],
		{ bgcolor: GREEN }
	)
	presets['subscribe_volume'] = button(
		'Subscribe audio volume',
		'Sub\\nVolume',
		[{ actionId: ActionId.SubscribeStatus, options: { standard: 'Audio/Volume', path: '' } }],
		{ bgcolor: GREEN }
	)
	presets['subscribe_main_video_source'] = button(
		'Subscribe main video source',
		'Sub\\nMain src',
		[{ actionId: ActionId.SubscribeStatus, options: { standard: 'Video/Input/MainVideoSource', path: '' } }],
		{ bgcolor: GREEN }
	)
	presets['subscribe_xevent'] = button(
		'Subscribe xEvent',
		'Sub\\nxEvent',
		[{ actionId: ActionId.SubscribeEvent, options: { path: 'CallDisconnect' } }],
		{ bgcolor: GREEN }
	)

	presets['custom-xconfig'] = button(
		'Custom xConfiguration',
		'custom\\nxConfiguration',
		[{ actionId: ActionId.CustomConfiguration, options: { path: 'Conference AutoAnswer Mode', Value: 'On' } }],
		{ size: '18' }
	)
	presets['custom_xcommand'] = button(
		'Custom xCommand',
		'custom\\nxCommand',
		[
			{
				actionId: ActionId.CustomCommand,
				options: { Method: 'Dial', Params: '{"Number":"123456789@meet24.webex.com"}' },
			},
		],
		{ size: '18' }
	)

	presets['osd_mode'] = button(
		'OSD Mode',
		'OSD Mode:\\n$(osd_mode)',
		[{ actionId: ActionId.OsdMode, options: { Mode: 'Toggle' } }],
		{ bgcolor: combineRgb(0, 60, 80) }
	)

	const structure: CompanionPresetSection[] = [
		{
			id: 'general',
			name: 'General functions',
			definitions: [
				'general_dial',
				'general_accept_all_calls',
				'general_disconnect',
				'general_dnd_on',
				'general_dnd_off',
			],
		},
		{
			id: 'audio',
			name: 'Audio',
			definitions: [
				'audio_volume',
				'audio_volume_up',
				'audio_volume_down',
				'audio_mic_mute',
				'audio_mic_unmute',
				'audio_mic_mute_toggle',
			],
		},
		{
			id: 'visual',
			name: 'Visual buttons',
			definitions: ['visual_software_version', 'visual_active_calls', 'visual_main_video_source'],
		},
		{
			id: 'video',
			name: 'Video',
			definitions: [
				'video_presentation_start',
				'video_presentation_stop',
				'video_selfview_on',
				'video_selfview_off',
				'video_camera_preset',
			],
		},
		{
			id: 'xapi',
			name: 'xAPI subscriptions',
			definitions: ['subscribe_xstatus', 'subscribe_volume', 'subscribe_main_video_source', 'subscribe_xevent'],
		},
		{
			id: 'custom',
			name: 'Custom',
			definitions: ['custom-xconfig', 'custom_xcommand'],
		},
		{
			id: 'osd',
			name: 'OSD',
			definitions: ['osd_mode'],
		},
	]

	return { structure, presets }
}
