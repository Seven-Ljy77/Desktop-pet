# Desktop Pet

A lightweight desktop companion for Windows and macOS. It uses a transparent,
always-on-top pet window, fetches dynamic interaction copy from a FastAPI
service, and renders messages in a separate click-through bubble window.

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

### 1. Install desktop dependencies

```powershell
npm install
```

### 2. Start FastAPI

Windows PowerShell:

```powershell
python -m venv services/api/.venv
services/api/.venv/Scripts/python -m pip install -e "services/api[dev]"
services/api/.venv/Scripts/python -m uvicorn app.main:app --app-dir services/api --reload
```

macOS:

```bash
python3 -m venv services/api/.venv
services/api/.venv/bin/python -m pip install -e 'services/api[dev]'
services/api/.venv/bin/python -m uvicorn app.main:app --app-dir services/api --reload
```

The service listens on `http://127.0.0.1:8000` by default. The API reloads
`services/api/app/data/messages.json` for every interaction, so copy changes
take effect without restarting the service.

### 3. Start the desktop pet

Open another terminal:

```powershell
npm run dev:desktop
```

A short click immediately requests fresh copy, while automatic hover
interactions remain enabled. Hold for about 220 ms or move the pointer to drag
the pet. The tray menu can show, hide, reset, or quit the application.

The default manual-click cooldown is 1200 ms. To change it, copy
`apps/desktop/.env.example` to `apps/desktop/.env` and set:

```dotenv
VITE_MANUAL_CLICK_COOLDOWN_MS=1200
```

The accepted range is 0–60000 ms. Restart or rebuild the desktop client after
changing it.

### Replace the character artwork

The character image currently used at runtime is:

```text
image/0.png
```

During development, replace this file directly with a new transparent PNG. No
code change is needed when the filename and path stay the same. When running
`npm run dev:desktop`, Vite watches the artwork and normally hot-reloads the
change. If it does not refresh immediately, save the image again, wait a few
seconds, or restart the development command.

The rendered image width is controlled by `.pet-image` in
`apps/desktop/src/styles.css`:

```css
.pet-image {
  width: 354px;
}
```

If you use a different filename, update the image import in
`apps/desktop/src/main.ts` as well:

```ts
import petImageUrl from "@pet-image/pet-new.png";
```

The artwork is a desktop-client resource, so replacing it does not require any
FastAPI or cloud-server change. Existing `.exe`, `.app`, or `.dmg` packages do
not update their embedded artwork automatically; rebuild and reinstall the
desktop client after replacing the image.

## Configure a remote backend

During local development the client uses FastAPI at
`http://127.0.0.1:8000` by default. To connect the desktop pet to the Ubuntu
cloud server, you do not need to run FastAPI locally or modify the source code.
Set `PET_SERVER_URL` in the same terminal that launches the desktop client.

### Configure the remote backend on Windows

Open Windows PowerShell and enter the project directory:

```powershell
cd D:\programming\desktop-pet
```

While ICP filing is pending, temporarily use the HTTP endpoint on the public
IP address:

```powershell
$env:PET_SERVER_URL = "http://139.196.46.8/api/v1/interactions"
```

Confirm the value in the current PowerShell session:

```powershell
$env:PET_SERVER_URL
```

Start the pet in the same PowerShell window so the child process inherits the
temporary environment variable:

```powershell
npm run dev:desktop
```

Clear the temporary value after testing:

```powershell
Remove-Item Env:PET_SERVER_URL
```

After ICP filing, DNS, and HTTPS are ready, use the production endpoint on
Windows:

```powershell
$env:PET_SERVER_URL = "https://api.desktop-pet.cn/api/v1/interactions"
npm run dev:desktop
```

### Configure the remote backend on macOS

Open Terminal and enter the cloned project directory. Adjust the path to match
where you saved the repository:

```bash
cd ~/path/to/Desktop-pet
```

While ICP filing is pending, temporarily use the HTTP endpoint on the public
IP address:

```bash
export PET_SERVER_URL="http://139.196.46.8/api/v1/interactions"
```

Confirm the value in the current Terminal session:

```bash
echo "$PET_SERVER_URL"
```

Start the pet in the same Terminal window:

```bash
npm run dev:desktop
```

Clear the temporary value after testing:

```bash
unset PET_SERVER_URL
```

After ICP filing, DNS, and HTTPS are ready, use the production endpoint on
macOS:

```bash
export PET_SERVER_URL="https://api.desktop-pet.cn/api/v1/interactions"
npm run dev:desktop
```

### Confirm requests reach the cloud server

After configuring either Windows or macOS, short clicks and hover interactions
should call the Ubuntu backend. Connect to the server over SSH and follow the
API logs:

```bash
cd /opt/Desktop-pet
docker compose --env-file deploy/.env -f deploy/compose.yaml logs -f --tail=100 api
```

An interaction should produce `POST /api/v1/interactions` and `200 OK`.
Pressing `Ctrl+C` only stops following the logs; it does not stop the server
containers.

`apps/desktop/.env` currently controls frontend build values such as
`VITE_MANUAL_CLICK_COOLDOWN_MS`. The Rust networking layer does not
automatically load `PET_SERVER_URL` from that file.

Production deployments should use HTTPS. The client has short network timeouts
and shows built-in fallback copy if the backend is unavailable. The current
public-IP HTTP endpoint is only for development while ICP filing is pending and
must not be compiled into a public release.

When `PET_SERVER_URL` is set during a release build, it is compiled into the
desktop application so end users do not need to configure it. A runtime value
still overrides the compiled endpoint for development. See the [cloud
deployment guide](docs/deployment.en.md) for the complete server workflow.

## Routine Docker operations on the cloud server

The current project directory on the cloud server is:

```text
/opt/Desktop-pet
```

Run the commands below after connecting to the Ubuntu server over SSH. First
enter the project directory:

```bash
cd /opt/Desktop-pet
```

The deployment has two containers:

- `api` runs FastAPI on internal port `8000`, which is not published directly.
- `caddy` listens on public ports `80/443`, proxies requests to `api`, and will
  obtain and renew HTTPS certificates automatically after the production domain
  is enabled.

### Check service status

```bash
docker compose --env-file deploy/.env -f deploy/compose.yaml ps
```

Normally, `api` should show `healthy` and `caddy` should show `Up`. To see every
container running on the server:

```bash
docker ps
```

### View logs

Show the latest 100 log lines:

```bash
docker compose --env-file deploy/.env -f deploy/compose.yaml logs --tail=100
```

Follow logs continuously:

```bash
docker compose --env-file deploy/.env -f deploy/compose.yaml logs -f --tail=100
```

Pressing `Ctrl+C` only exits log following and does not stop the containers. Add
a service name to inspect one service:

```bash
docker compose --env-file deploy/.env -f deploy/compose.yaml logs -f --tail=100 api
docker compose --env-file deploy/.env -f deploy/compose.yaml logs -f --tail=100 caddy
```

### Start, stop, and restart

Start existing services:

```bash
docker compose --env-file deploy/.env -f deploy/compose.yaml up -d
```

`-d` runs the containers in the background, so they continue running after the
SSH session ends.

Restart all services:

```bash
docker compose --env-file deploy/.env -f deploy/compose.yaml restart
```

Restart only the API:

```bash
docker compose --env-file deploy/.env -f deploy/compose.yaml restart api
```

Stop services while retaining their containers:

```bash
docker compose --env-file deploy/.env -f deploy/compose.yaml stop
```

Start previously stopped containers:

```bash
docker compose --env-file deploy/.env -f deploy/compose.yaml start
```

Stop and remove the containers and Compose network:

```bash
docker compose --env-file deploy/.env -f deploy/compose.yaml down
```

A normal `down` does not delete the named volumes that store Caddy HTTPS
certificate data. Do not casually add `-v`, because it also removes those
volumes.

Both services use `restart: unless-stopped`. They normally recover after the
server or Docker restarts. If you explicitly ran `stop`, run `start` or `up -d`
to start them again.

### Pull code and redeploy

First confirm that the server worktree has no temporary modifications:

```bash
git status
```

Fetch the latest commit from GitHub:

```bash
git pull --ff-only
```

Rebuild images and apply the configuration:

```bash
docker compose --env-file deploy/.env -f deploy/compose.yaml up -d --build
```

Compose rebuilds only the parts that changed. Run `ps` and the health check
afterwards instead of relying only on the build command's exit status.

### Check API endpoints

While ICP filing is pending, check the API through the public IP:

```bash
curl http://139.196.46.8/health
```

Expected response:

```json
{"status":"ok"}
```

Test the interaction endpoint:

```bash
curl -X POST http://139.196.46.8/api/v1/interactions \
  -H "Content-Type: application/json" \
  -d '{"event":"manual_click","pet_id":"default","client_id":"cloud-test","locale":"zh-CN","app_version":"0.1.0"}'
```

After ICP filing, DNS, and HTTPS are complete, use the domain health check:

```bash
curl https://api.desktop-pet.cn/health
```

### Update dynamic messages

The message file is mounted read-only from the host, and the API reloads it for
every interaction, so editing it does not require a container restart:

```bash
nano services/api/app/data/messages.json
```

After saving, ask the running API container to validate the JSON syntax:

```bash
docker compose --env-file deploy/.env -f deploy/compose.yaml exec -T api \
  python -m json.tool /app/app/data/messages.json > /dev/null
```

No output and exit code `0` mean that the JSON is valid. Display the last exit
code with:

```bash
echo $?
```

Back up the file before editing it:

```bash
cp services/api/app/data/messages.json /root/desktop-pet-messages.json.bak
```

### Change the deployment address

Show the current deployment environment:

```bash
cat deploy/.env
```

Edit it:

```bash
nano deploy/.env
```

Temporary public-IP configuration:

```dotenv
PET_DOMAIN=http://139.196.46.8
```

Production configuration after ICP filing and DNS:

```dotenv
PET_DOMAIN=api.desktop-pet.cn
```

Apply the new configuration:

```bash
docker compose --env-file deploy/.env -f deploy/compose.yaml up -d
```

### Inspect resources and remove old images

Show current container resource usage:

```bash
docker stats --no-stream
```

Show Docker disk usage:

```bash
docker system df
```

Remove only dangling images that no container uses:

```bash
docker image prune
```

Read Docker's deletion summary before confirming. Do not use
`docker system prune -a --volumes` unless you fully understand its impact.

### Common troubleshooting commands

Validate and expand the Compose configuration:

```bash
docker compose --env-file deploy/.env -f deploy/compose.yaml config
```

Inspect the API health-check state:

```bash
docker inspect --format='{{json .State.Health}}' desktop-pet-api-1
```

Check listening server ports:

```bash
ss -lntp | grep -E ':80|:443'
```

Inspect the Docker service:

```bash
systemctl status docker
```

Open a shell in the API container for read-only diagnostics:

```bash
docker compose --env-file deploy/.env -f deploy/compose.yaml exec api sh
```

Enter `exit` to leave the container. The production configuration makes the
container filesystem read-only, so do not edit application files inside the
container. Maintain code and messages in the host repository, then apply
updates with Compose.

The security group should expose only public web ports `80/443`. Restrict SSH
port `22` to trusted public IP addresses, and never expose FastAPI port `8000`
to the public internet.

## Platform notes

- Windows requires WebView2 and the Visual Studio C++ Build Tools used by Rust.
- macOS requires Xcode Command Line Tools. Signing, notarization, transparent
  windows, multiple monitors, and Retina scaling must be verified on a real Mac.
- Tauri transparent windows on macOS require `macOSPrivateApi`. Tauri warns that
  this prevents Mac App Store acceptance, though direct signed and notarized
  distribution remains the intended path. See the [architecture
  notes](docs/architecture.md).

## Checks

```powershell
npm run check:frontend
npm run build:frontend
cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml
services/api/.venv/Scripts/python -m pytest services/api/tests
```
