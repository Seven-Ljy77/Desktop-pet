# Desktop Pet

A lightweight desktop companion for Windows and macOS. It uses a transparent,
always-on-top pet window and fetches dynamic hover copy from a FastAPI service.
Messages are rendered in a separate click-through bubble window.

Chinese documentation: [README.md](README.md)

## Repository layout

```text
apps/desktop/       Tauri 2 + TypeScript desktop client
services/api/       FastAPI interaction service
shared/contracts/   Language-neutral API contract
image/              Source artwork; image/0.png is currently used at runtime
docs/               Architecture and platform notes
deploy/             Docker Compose and Caddy production configuration
```

## Local development

Install JavaScript dependencies:

```bash
npm install
```

Create the Python environment and start the API on macOS:

```bash
python3 -m venv services/api/.venv
services/api/.venv/bin/python -m pip install -e 'services/api[dev]'
services/api/.venv/bin/python -m uvicorn app.main:app --app-dir services/api --reload
```

On Windows PowerShell, use `services/api/.venv/Scripts/python` instead of the
macOS interpreter path. Start the desktop app from another terminal:

```bash
npm run dev:desktop
```

A short click immediately requests fresh copy, while automatic hover interactions
remain enabled. Hold for about 220 ms or move the pointer to drag the pet. To
change the default 1200 ms manual-click cooldown, copy
`apps/desktop/.env.example` to `apps/desktop/.env` and set:

```dotenv
VITE_MANUAL_CLICK_COOLDOWN_MS=1200
```

The API defaults to `http://127.0.0.1:8000`. Update
`services/api/app/data/messages.json` to change the next hover response without
restarting the server. Set `PET_SERVER_URL` before launching the desktop app to
use a deployed HTTPS endpoint.

When set during a release build, `PET_SERVER_URL` is compiled into the desktop
application, so end users do not need to configure it. A runtime value still
overrides the compiled endpoint for development. See the [cloud deployment
guide](docs/deployment.en.md) for the complete server workflow.

## Platform notes

- Windows requires WebView2 and the Visual Studio C++ Build Tools used by Rust.
- macOS requires Xcode Command Line Tools. Signing, notarization, transparent
  windows, multiple monitors, and Retina scaling must be verified on a real Mac.
- Tauri transparent windows on macOS require `macOSPrivateApi`. Tauri warns that
  this prevents Mac App Store acceptance, though direct signed and notarized
  distribution remains the intended path for this project.

See [the architecture notes](docs/architecture.md) for design details.
