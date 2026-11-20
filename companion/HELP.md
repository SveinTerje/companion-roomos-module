## Cisco RoomOS module

This module connects to Cisco RoomOS devices over **WebSocket** (preferred) or SSH using [jsxapi](https://www.npmjs.com/package/jsxapi). xAPI reference: [roomos.cisco.com/xapi](https://roomos.cisco.com/xapi)

### Connection

WebSocket is the default. On the device you need:

- `xConfiguration NetworkServices HTTP Mode: HTTP+HTTPS` or `HTTPS`
- `xConfiguration NetworkServices Websocket: FollowHTTPService`

Subscriptions are per connection. After a reconnect this module re-subscribes automatically. After a Companion restart, run the subscribe actions again (for example from a page you press once, or from a trigger).

Cisco allows **at most 50** `xFeedback` expressions on one session. This module never registers `/Status` as a whole.

### Built-in xStatus (always subscribed)

| Path | Variable |
| --- | --- |
| `Audio Volume` | `volume` |
| `SystemUnit State NumberOfActiveCalls` | `number_of_active_calls` |

Call, mute, auto-answer and the other existing variables still update. They use specific xStatus/xConfiguration paths, not the entire Status tree.

### xStatus: Subscribe / Unsubscribe

The generic subscribe action is the main way to use more of the xAPI.

1. Add action **xStatus: Subscribe**.
2. Enter a path. These forms all work:
   - `Audio Volume`
   - `xStatus Audio Volume`
   - `Status.Audio.Volume`
   - `/Status/Audio/Volume`
3. A Companion variable is created, named `status_` + the path with underscores, for example `status_Standby_State`.
4. Put that variable on a button if you want it visible. This module does not add a colour feedback for generic paths.

**xStatus: Unsubscribe** lists current custom status subscriptions. Built-in paths cannot be removed from this list.

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
