# AJB-AiOC

All-in-one AI operations centre powered by OpenClaw, running as a single Docker Compose stack.

---

## Prerequisites

- Git
- Docker Engine + Docker Compose plugin (instructions below)

---

## 1. Install Docker

### Linux Server (Ubuntu / Debian)

```bash
# Remove old versions
sudo apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

# Install dependencies
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key and repo
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine + Compose plugin
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Allow running Docker without sudo (log out and back in after this)
sudo usermod -aG docker $USER
```

Verify:

```bash
docker --version
docker compose version
```

### macOS

Install [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/) — it includes both Docker Engine and the Compose plugin.

1. Download and open the `.dmg` from the Docker website.
2. Drag Docker to Applications and launch it.
3. Wait for the whale icon in the menu bar to show "Docker Desktop is running".

Verify:

```bash
docker --version
docker compose version
```

---

## 2. Clone the repository

```bash
git clone https://github.com/acgitprojects/Openclaw.git
cd Openclaw
```

---

## 3. Configure environment

Copy the example env file and set your secrets:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# PostgreSQL password
POSTGRES_PASSWORD=changeme

# OpenClaw gateway token — must match openclaw/openclaw.json
OPENCLAW_GATEWAY_TOKEN=devtoken

# Admin password for the AJB-AiOC web UI
ADMIN_PASSWORD=changeme
```

> **Note:** The `OPENCLAW_GATEWAY_TOKEN` value must match the `gateway.auth.token` field in `openclaw/openclaw.json`.

---

## 4. Start the stack

```bash
docker compose up -d --build
```

This starts:
- `postgres` — database
- `openclaw-init` — copies config into the OpenClaw volume
- `openclaw` — the OpenClaw gateway
- `api-server` — the AJB API backend
- `frontend` — the Next.js UI
- `nginx` — reverse proxy (public entry point on port **5100**)

Check all services are running:

```bash
docker compose ps
```

---

## 5. Run the OpenClaw onboard command

After the stack is up, run the OpenClaw interactive onboard wizard to configure your AI providers and API keys:

```bash
docker exec -it openclaw openclaw onboard
```

Follow the prompts to add your AI provider credentials (e.g. OpenRouter, Anthropic, OpenAI). Once complete, the OpenClaw gateway will have access to your configured models.

To verify models are available:

```bash
docker exec openclaw openclaw models list
```

---

## 6. Access the UI

Open your browser and navigate to:

```
http://localhost:5100
```

If running on a remote Linux server, replace `localhost` with your server's IP address or domain:

```
http://<your-server-ip>:5100
```

> **Default admin credentials:**
> - Username: `admin`
> - Password: the value of `ADMIN_PASSWORD` in your `.env` (default: `changeme`)

---

## Useful commands

```bash
# View logs for all services
docker compose logs -f

# View logs for a specific service
docker compose logs -f openclaw
docker compose logs -f api-server

# Stop the stack
docker compose down

# Stop and remove all data (destructive)
docker compose down -v
```
