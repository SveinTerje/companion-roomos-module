## Cisco RoomOS module

This module requires **Companion 5.x**. It connects to Cisco RoomOS devices over **WebSocket** (preferred) or SSH using [jsxapi](https://www.npmjs.com/package/jsxapi). xAPI reference: [roomos.cisco.com/xapi](https://roomos.cisco.com/xapi)

### Connection

WebSocket is the default. On the device you need:

- `xConfiguration NetworkServices HTTP Mode: HTTP+HTTPS` or `HTTPS`
- `xConfiguration NetworkServices Websocket: FollowHTTPService`

Use **Websocket (HTTPS)** when HTTP Mode is `HTTPS` or `HTTP+HTTPS`. If Companion logs `Unexpected server response: 502` on connect, the codec's TLS WebSocket path is refusing the upgrade — switch the connection protocol to **Websocket (HTTP)** (requires HTTP Mode `HTTP+HTTPS`) or **ssh**.

Initial xStatus/xConfiguration values are pushed with each subscription (`NotifyCurrentValue`). This module does not `xGet` whole trees such as `Status Audio` on connect, which some codecs reject while live xFeedback still works.

Subscriptions are per connection. After a reconnect this module re-subscribes automatically. After a Companion restart, run the subscribe actions again (for example from a page you press once, or from a trigger).

Cisco allows **at most 50** `xFeedback` expressions on one session. This module never registers `/Status` as a whole.

### Session variables (always present)

These are not codec xStatus nodes. They do not use an xFeedback slot.

| Variable | Meaning |
| --- | --- |
| `event_last_path` | Path of the most recent **subscribed** xEvent (for example `CallDisconnect`). Empty until an xEvent subscription fires. |
| `event_last_value` | That event’s payload as a string (or JSON if the payload is an object). |
| `event_last_json` | The same payload always as JSON. Use this when you need to parse fields. |
| `event_last_time` | ISO timestamp when that event arrived (this computer’s clock). |
| `event_last_count` | Monotonic counter of every subscribed xEvent. Use **Triggers → Variable changed** on this when you want “any event”, including repeats with the same payload. |
| `xfeedback_count` | How many xFeedback expressions are registered on the current session. |

### Standard xStatus (assignable, not subscribed until activated)

These variables appear in Companion’s variable picker so you can put them on a button. They stay empty and **do not register xFeedback** until you run **xStatus: Subscribe** and choose that status (or type the path).

| Path | Variable |
| --- | --- |
| `SystemUnit Software Version` | `SystemUnit_Software_Version` |
| `SystemUnit State NumberOfActiveCalls` | `number_of_active_calls` |
| `Audio SelectedDevice` | `selected_device` |
| `Audio Microphones Mute` | `microphones_mute` |
| `Audio Input Connectors Microphone` | `audio_connector_mute` |
| `Time SystemTime` | `systemtime` |
| `Conference Presentation` | `Presentation` |

Cisco allows **at most 50** xFeedback expressions. Activating only what you use keeps slots free.

### xStatus: Subscribe / Unsubscribe

1. Add action **xStatus: Subscribe**.
2. Choose a **standard** status from the dropdown, or **Custom path…** and enter a path. These custom forms all work:
   - `Audio Volume`
   - `xStatus Audio Volume`
   - `Status.Audio.Volume`
   - `/Status/Audio/Volume`
3. A custom path creates `status_` + the path with underscores, for example `status_Standby_State`. Standard paths keep the names in the table above.
4. Put that variable on a button if you want it visible. This module does not add a colour feedback for generic paths.

**xStatus: Unsubscribe** lists currently **activated** status subscriptions.

### xEvent: Subscribe / Unsubscribe

1. Add action **xEvent: Subscribe** with a path such as `CallDisconnect` or `UserInterface Extensions Widget Action`.
2. The module sets:
   - `event_<path>` — last payload (string or JSON)
   - `event_<path>_json` — JSON payload
   - `event_<path>_time` — ISO timestamp
   - `event_<path>_count` — increments on every event
3. It also updates shared variables: `event_last_path`, `event_last_value`, `event_last_json`, `event_last_time`, `event_last_count`.

Companion has no module-defined trigger type. Use a **Triggers** tab entry of type **Variable changed**:

- Watch `event_<path>_count` for one event.
- Watch `event_last_count` for any subscribed event.

`_count` always changes, even when the payload is the same twice in a row.

`xfeedback_count` shows how many expressions are registered on the current session.

### Call actions

- Dial
- Disconnect
- Accept
- Auto Answer Mode
- Auto Answer Mute
- Auto Answer Delay

### Audio actions

- Set volume of device
- Mute/Unmute Microphones
- Microphone input
- Music mode on/off
- Noise removal on/off

### Presentation

- Start/Stop

### Camera

- Set Main Video Source
- Activate preset
- Camera Position Set
- Video Matrix Reset
- Trigger Auto Focus
- Camera Ramp
- Camera Background

### Video

- Monitors
- Output Monitor Role

### Conference

- Do Not Disturb
- Selfview

### Custom actions

- Custom xConfiguration
- Custom xCommand
- DTMF Send
- OSD Key Click
- OSD Key Press
- OSD Key Release
- Send Message
- xStatus: Subscribe / Unsubscribe
- xEvent: Subscribe / Unsubscribe
- xFeedback: Unsubscribe all custom

### Other

- Stand-by
