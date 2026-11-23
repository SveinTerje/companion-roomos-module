# companion-roomos-module

Evolution of [bitfocus/companion-module-cisco-roomos](https://github.com/bitfocus/companion-module-cisco-roomos) (v2.0.1) with generic xStatus and xEvent subscriptions.

See [companion/HELP.md](companion/HELP.md) and [LICENSE](LICENSE).

xAPI reference: [https://roomos.cisco.com/xapi](https://roomos.cisco.com/xapi)

## Install as a developer module

This module is not in the Companion store yet. Load it locally. Companion scans **subfolders** of a developer modules path, so the path you set in Companion must be the parent folder, not this repository folder itself.

You need:

- [Companion](https://bitfocus.io/companion) 4.x
- [Git](https://git-scm.com/downloads)
- [Node.js](https://nodejs.org/) 18 (Node 22 works; add `--ignore-engines` to `yarn install` if Yarn complains)
- [Yarn 1](https://classic.yarnpkg.com/en/docs/install) (`npm install -g yarn`)

### 1. Create a developer folder and clone this repo

**macOS or Linux** (Terminal):

```bash
mkdir -p ~/companion-dev
cd ~/companion-dev
git clone -b cursor/xapi-subscriptions-4f46 https://github.com/SveinTerje/companion-roomos-module.git
cd companion-roomos-module
yarn install --ignore-engines
yarn build
```

**Windows** (PowerShell):

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\companion-dev" | Out-Null
Set-Location "$env:USERPROFILE\companion-dev"
git clone -b cursor/xapi-subscriptions-4f46 https://github.com/SveinTerje/companion-roomos-module.git
Set-Location companion-roomos-module
yarn install --ignore-engines
yarn build
```

If you already cloned the repo somewhere else, put a copy or a symlink of `companion-roomos-module` inside `companion-dev` instead of cloning again.

- macOS / Linux: `ln -s /path/to/companion-roomos-module ~/companion-dev/companion-roomos-module`
- Windows (Administrator Command Prompt): `mklink /D "%USERPROFILE%\companion-dev\companion-roomos-module" C:\path\to\companion-roomos-module`

### 2. Point Companion at the parent folder

1. Open the Companion **launcher** (the small Companion window, not the button grid).
2. Open **Settings** (cog).
3. Under **Developer**, turn on **Enable Developer Modules**.
4. Set **Developer Modules Path** to the parent folder:
   - macOS / Linux: `/Users/<you>/companion-dev` or `~/companion-dev`
   - Windows: `C:\Users\<you>\companion-dev`
5. Apply / save. Companion should log that it found `cisco-roomos` in that folder. Restart Companion if the connection type does not appear.

On a headless Linux install you can instead start Companion with `--extra-module-path /home/<you>/companion-dev`.

### 3. Add the connection

1. Open the Companion admin UI (usually http://127.0.0.1:8000).
2. **Connections** → add **Cisco RoomOS**.
3. Prefer **Websocket**. On the codec set HTTP or HTTPS on, and `xConfiguration NetworkServices Websocket: FollowHTTPService`.

After code changes, run `yarn build` (or `yarn dev` to rebuild on save). Companion reloads developer modules when files change.

### 4. Check it loaded

- `volume` and `number_of_active_calls` update without a subscribe action.
- **xStatus: Subscribe** with e.g. `Standby State` creates `status_Standby_State`.
- **xEvent: Subscribe** with `CallDisconnect` plus a **Triggers → Variable changed** entry on `event_CallDisconnect_count` fires when a call disconnects.

