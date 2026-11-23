import { RoomOSInstanceBase, RoomOSOnOffBoolean } from './roomos.js'
import { connect as XAPIConnect } from 'jsxapi'
import { GetActionsList } from './actions.js'
import { DeviceConfig, GetConfigFields } from './config.js'
import { GetFeedbacksList } from './feedback.js'
import { GetPresetsList } from './presets.js'
import { InitVariables } from './variables.js'
import { SubscriptionManager } from './subscriptions.js'
import { formatXapiError, installJsxapiPatches, isTransportFailure } from './xapi-rpc.js'
import { InstanceStatus, SomeCompanionConfigField } from '@companion-module/base'

export { UpgradeScripts } from './upgrades.js'

const TRANSPORT_ERROR_LOG_INTERVAL_MS = 30_000

export default class ControllerInstance extends RoomOSInstanceBase {
	private connected: boolean
	private connecting: boolean
	private timer?: NodeJS.Timeout
	private connectionEpoch = 0
	private lastTransportErrorLogAt = 0

	private config!: DeviceConfig

	constructor(internal: unknown) {
		super(internal)

		this.connected = false
		this.connecting = false
		this.subscriptions = new SubscriptionManager(this)
	}

	public async init(config: DeviceConfig, _isFirstInit: boolean, secrets: undefined): Promise<void> {
		await this.configUpdated(config, secrets)
		this.timer = setInterval(() => this.tick(), 5000)
	}
	/**
	 * INTERNAL: Setup connection
	 *
	 * @access protected
	 */
	public tick(): void {
		if (!this.connected)
			console.log('Tick:', { connected: this.connected, connecting: this.connecting, host: this.config?.host })
		if (!this.connected && !this.connecting) {
			if (this.config.host) {
				this.initSSH()
			}
		}
	}
	/**
	 * Setup connection for SSH connection
	 */
	public initSSH(): void {
		this.dropConnection()
		InitVariables(this)

		if (!this.config.host) {
			return
		}

		const epoch = this.connectionEpoch

		try {
			const { host, username, password, protocol } = this.config
			this.xapi = XAPIConnect(`${protocol}://` + host, {
				username,
				password,
				loglevel: 'error',
			})
			installJsxapiPatches(this.xapi.constructor as { prototype: { execute: (method: string, params?: unknown) => Promise<unknown> } })

			this.connecting = true
			this.updateStatus(InstanceStatus.Connecting)

			this.xapi.on('error', (error) => {
				if (epoch !== this.connectionEpoch) return
				const message = formatXapiError(error)
				if (!isTransportFailure(error)) {
					this.log('debug', `Cisco RoomOS RPC error (connection kept): ${message}`)
					return
				}
				this.logTransportFailure(message)
				this.dropConnection()
				this.updateStatus(InstanceStatus.ConnectionFailure, message)
			})

			this.xapi.on('ready', () => {
				if (epoch !== this.connectionEpoch) return
				this.updateStatus(InstanceStatus.Ok)
				this.connected = true
				this.connecting = false
				if (this.xapi) this.subscriptions.attach(this.xapi)
				this.checkAllFeedbacks()
			})

			// Path-specific xFeedback is registered in SubscriptionManager.attach() on 'ready'.
			// Initial values come from xFeedback/Subscribe NotifyCurrentValue, not xGet.
		} catch (e: unknown) {
			this.log('error', 'Error connecting to RoomOS device: ' + formatXapiError(e))
			this.dropConnection()
			this.updateStatus(InstanceStatus.ConnectionFailure)
		}
	}

	private dropConnection(): void {
		this.connectionEpoch += 1
		try {
			this.subscriptions.detach()
		} catch {
			// ignore
		}
		const xapi = this.xapi
		this.xapi = undefined
		this.connected = false
		this.connecting = false
		if (xapi) {
			try {
				xapi.close()
			} catch {
				// ignore
			}
		}
		this.reset()
	}

	private logTransportFailure(message: string): void {
		const now = Date.now()
		if (now - this.lastTransportErrorLogAt < TRANSPORT_ERROR_LOG_INTERVAL_MS) {
			this.log('debug', `Cisco RoomOS connection error: ${message}`)
			return
		}
		this.lastTransportErrorLogAt = now
		this.log('error', `Cisco RoomOS connection error: ${message}`)
	}

	/**
	 * INTERNAL: Reset class variables
	 *
	 * @access protected
	 */
	reset(): void {
		this.ongoingCalls = []
		this.connected = false
		this.hasIngoingCall = false
		this.hasOutgoingCall = false
		this.hasRingingCall = false
		this.autoAnswerConfig = {
			Delay: '',
			Mode: RoomOSOnOffBoolean.Unknown,
			Mute: RoomOSOnOffBoolean.Unknown,
		}
	}

	// private processJSON(msg: WebexMessage): void {
	// 	let message = JSON.parse(msg.toString())
	// 	if (message.method == 'xFeedback/Event') {
	// 		if (message.params.Status != undefined) {
	// 			let status = message.params.Status
	// 			if (status.Audio != undefined) {
	// 				if (status.Audio.SelectedDevice != null) this.setVariable('selected_device', status.Audio.SelectedDevice)

	// 				if (
	// 					status.Audio.Input != undefined &&
	// 					status.Audio.Input.Connectors != undefined &&
	// 					status.Audio.Input.Connectors.Microphone != undefined
	// 				) {
	// 					let muteState = ''
	// 					for (let index = 0; index < status.Audio.Input.Connectors.Microphone.length; index++) {
	// 						const element = status.Audio.Input.Connectors.Microphone[index]
	// 						muteState += `(Mic ${element.id} Mute: ${element.Mute})`
	// 						this.connectorMute[element.id] = element.Mute
	// 					}
	// 					this.setVariable('audio_connector_mute', muteState)
	// 				}
	// 				if (status.Audio.Volume != null) this.setVariable('volume', status.Audio.Volume)
	// 				if (status.Audio.Microphones != undefined && status.Audio.Microphones.MusicMode != undefined)
	// 					this.setVariable('microphones_musicmode', status.Audio.Microphones.MusicMode)
	// 				if (status.Audio.Microphones != undefined && status.Audio.Microphones.Mute != undefined) {
	// 					this.setVariable('microphones_mute', status.Audio.Microphones.Mute)
	// 					this.microphoneMute = status.Audio.Microphones.Mute == 'On' ? true : false
	// 					this.checkFeedbacks(FeedbackId.MicrophoneMute)
	// 				}
	// 			} else if (status.Call != undefined) {
	// 				this.ongoingCalls.length = 0
	// 				let outgoing = 0
	// 				let incoming = 0
	// 				let incoming_ringing = 0

	// 				status.Call.forEach((call: WebexCall) => {
	// 					this.ongoingCalls.push(call)
	// 					if (call.Direction == 'Outgoing') {
	// 						outgoing++
	// 					}
	// 					if (call.Direction == 'Incoming') {
	// 						incoming++
	// 					}
	// 					if (call.Status == 'Ringing') {
	// 						incoming_ringing++
	// 					}
	// 					this.setVariable('outgoing_calls', outgoing.toString())
	// 					this.setVariable('ingoing_calls', incoming.toString())
	// 					this.setVariable('ingoing_ringing_calls', incoming_ringing.toString())

	// 					outgoing > 0 ? (this.hasOutgoingCall = true) : (this.hasOutgoingCall = false)
	// 					incoming > 0 ? (this.hasIngoingCall = true) : (this.hasIngoingCall = false)
	// 					incoming_ringing > 0 ? (this.hasRingingCall = true) : (this.hasRingingCall = false)

	// 					this.checkFeedbacks(FeedbackId.Ringing)
	// 					this.checkFeedbacks(FeedbackId.HasIngoingCall)
	// 					this.checkFeedbacks(FeedbackId.HasOutgoingCall)
	// 				})

	// 				// console.log(this.ongoingCalls)
	// 			} else if (status.Time != undefined) {
	// 				if (status.Time.SystemTime != null) {
	// 					// let dateTime = new Date(status.Time.SystemTime)
	// 					// let showMsg = `${dateTime.getHours}:${dateTime.getMinutes} ${dateTime.getDay}-${dateTime.getMonth}-${dateTime.getFullYear}`
	// 					this.setVariable('systemtime', status.Time.SystemTime)
	// 				}
	// 			} else if (status.Conference != undefined) {
	// 				if (status.Conference.DoNotDisturb != null) {
	// 					this.setVariable('DoNotDisturb', status.Conference.DoNotDisturb)
	// 				}
	// 				if (status.Conference.Presentation != null) {
	// 					this.setVariable('Presentation', status.Conference.Presentation)
	// 				}
	// 				if (status.Conference.SelectedCallProtocol != null) {
	// 					this.setVariable('SelectedCallProtocol', status.Conference.SelectedCallProtocol)
	// 				}
	// 			} else if (status.Video != undefined && status.Video.Input != undefined) {
	// 				if (status.Video.Input.MainVideoSource != null) {
	// 					this.setVariable('MainVideoSource', status.Video.Input.MainVideoSource)
	// 				}
	// 				// if (status.Video.Input.Source [n] ConnectorId != null) {
	// 				// 	this.setVariable('Source [n] ConnectorId', status.Video.Input.Source [n] ConnectorId)
	// 				// }
	// 			} else {
	// 				console.log('feedback:', status)
	// 			}
	// 		}
	// 		if (
	// 			message.params.Configuration != undefined &&
	// 			message.params.Configuration.Conference != undefined &&
	// 			message.params.Configuration.Conference.AutoAnswer != undefined
	// 		) {
	// 			let AutoAnswer = message.params.Configuration.Conference.AutoAnswer
	// 			if (AutoAnswer.Mode != null)
	// 				this.setVariable('autoanswer_mode', message.params.Configuration.Conference.AutoAnswer.Mode)
	// 			if (AutoAnswer.Mute != null)
	// 				this.setVariable('autoanswer_mute', message.params.Configuration.Conference.AutoAnswer.Mute)
	// 			if (AutoAnswer.Delay != null)
	// 				this.setVariable('autoanswer_delay', message.params.Configuration.Conference.AutoAnswer.Delay)
	// 		}
	// 	} else {
	// 		console.log('message:', message)
	// 	}
	// }
	/**
	 * Process an updated configuration array.
	 *
	 * @param {DeviceConfig} config
	 * @memberof ControllerInstance
	 */
	public async configUpdated(config: DeviceConfig, _secrets: undefined): Promise<void> {
		this.config = config
		this.setActionDefinitions(GetActionsList(this))
		InitVariables(this)
		this.initSSH()
		this.setFeedbackDefinitions(GetFeedbacksList(this))
		const { structure, presets } = GetPresetsList()
		this.setPresetDefinitions(structure, presets)
	}

	/**
	 * Creates the configuration fields for web config.
	 */
	public getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields()
	}

	/**
	 * Clean up the instance before it is destroyed.
	 */
	public async destroy(): Promise<void> {
		this.dropConnection()

		if (this.timer !== undefined) {
			clearInterval(this.timer)
			this.timer = undefined
		}
	}
}
