# Cloud deployment

This stack deploys only the Desktop Pet FastAPI backend. The Windows and macOS clients continue to run on user devices and call the server over HTTPS.

## Requirements

- A Linux cloud server with a public IPv4 address
- A domain such as `pet-api.example.com` pointing to that address
- TCP ports 80 and 443, plus UDP port 443, allowed by the firewall/security group
- Docker Engine and Docker Compose v2

Port 8000 does not need to be public. FastAPI is reachable only by Caddy on the internal Docker network.

## First deployment

Clone the repository on the server, then run from the repository root:

```bash
cp deploy/.env.example deploy/.env
```

Set the real domain in `deploy/.env`:

```dotenv
PET_DOMAIN=pet-api.example.com
```

After DNS resolves to the server, start the stack:

```bash
docker compose --env-file deploy/.env -f deploy/compose.yaml up -d --build
```

Caddy obtains and renews the HTTPS certificate automatically. Verify the deployment:

```bash
docker compose --env-file deploy/.env -f deploy/compose.yaml ps
docker compose --env-file deploy/.env -f deploy/compose.yaml logs --tail=100
curl https://pet-api.example.com/health
```

The health endpoint should return `{"status":"ok"}`.

## Updating messages

The API reloads `services/api/app/data/messages.json` for every interaction. Editing that file on the server therefore takes effect without restarting the container. Back it up first and keep it valid JSON.

## Updating the service

After pulling a new revision, run:

```bash
docker compose --env-file deploy/.env -f deploy/compose.yaml up -d --build
docker image prune -f
```

The second command removes only unused images and may be omitted.

## Building a production desktop client

Set the complete endpoint before building. It is compiled into the desktop application:

```powershell
$env:PET_SERVER_URL = "https://pet-api.example.com/api/v1/interactions"
npm run build:desktop
```

On macOS or Linux:

```bash
PET_SERVER_URL="https://pet-api.example.com/api/v1/interactions" npm run build:desktop
```

A runtime `PET_SERVER_URL` environment variable can still override the compiled endpoint for development and diagnostics.

The production command intentionally uses one Uvicorn worker because the current service remembers each client's previous message in process memory. Move that state to Redis or a database before running multiple workers or replicas.
