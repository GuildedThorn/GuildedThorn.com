# GuildedThorn.com

[![CI](https://github.com/GuildedThorn/GuildedThorn.com/actions/workflows/ci.yml/badge.svg)](https://github.com/GuildedThorn/GuildedThorn.com/actions/workflows/ci.yml)

My personal portfolio and self-hosted platform — an **ASP.NET Core 10** backend serving a **React + TypeScript + Vite** single-page app. The backend exposes a JSON API (`/api/*`) and SignalR hubs, and serves the compiled frontend as static files from `wwwroot/`.

It's a portfolio, but also a playground: a markdown blog, an EXIF-aware photo gallery, live internet radio, real-time chat, a guestbook, developer tools, and hardware-key login all live in one app.

---

## Features

- **Auth** — password (BCrypt) with an HttpOnly JWT cookie, **passwordless WebAuthn / FIDO2 (YubiKey & passkeys)**, and optional **security-key 2FA** on top of a password. Roles: `owner` and `user`.
- **Blog** — markdown posts with code highlighting, tag filtering, full-text search, pagination, and an **RSS feed**.
- **Gallery** — image uploads with **EXIF** extraction and tag search.
- **Radio** — live internet radio (Icecast source relay) with a **SignalR** now-playing feed and **Web Push** "going live" notifications.
- **Chat** — real-time SignalR chat with owner moderation (bans, anti-raid / slow mode).
- **Projects** — a live, searchable/filterable index of GitHub repos (pinned + recent) with a language breakdown.
- **Guestbook** — one signed message per user, with owner delete/ban.
- **Contact** — a message form (stored in Mongo) plus social links.
- **Tools** — color converter, regex tester, UUID & lorem-ipsum generators, Pomodoro timer.
- **Misc** — print-optimized résumé, a ReactFlow network diagram, an owner inbox, light/dark/system theme toggle, and a cookie-consent CMP.

---

## Tech stack

| Layer        | Tech                                                                          |
| ------------ | ----------------------------------------------------------------------------- |
| Frontend     | React 19, TypeScript, Vite 6, Tailwind CSS 4, React Router 7                  |
| Backend      | ASP.NET Core 10, JWT auth (HttpOnly cookie), WebAuthn (Fido2NetLib), SignalR   |
| Data / infra | MongoDB, RabbitMQ, Icecast, Grafana Loki (logging)                            |
| Testing      | xUnit + Testcontainers (backend), Vitest + Testing Library (frontend)         |
| Tooling      | Nix flake (dev shell + reproducible build), Bun, Docker, GitHub Actions CI    |

---

## Repository layout

```
.
├── Program.cs                  # Backend entry: DI, middleware, security, routing
├── Controllers/                # API controllers (/api/[controller])
├── Models/                     # MongoDB document models
├── Services/                   # Mongo, RabbitMQ, chat/moderation, radio, push, JWT, WebAuthn
├── Resources/config.json       # Local-only config (gitignored — holds secrets)
├── Tests/                      # xUnit unit + Testcontainers integration tests
├── .github/workflows/ci.yml    # CI: builds + tests backend and frontend
├── GuildedThorn.com-Frontend/  # React + Vite app (builds into ../wwwroot)
├── wwwroot/                    # Compiled frontend + uploaded gallery images (generated)
├── dev/                        # Local dev scripts (up/down/seed)
├── flake.nix                   # Nix dev shell, reproducible build, NixOS module
└── Dockerfile                  # Multi-stage container build
```

---

## Quick start (local development)

You need a container engine (`podman` or `docker`) for MongoDB + RabbitMQ. The toolchain (`dotnet`, `bun`, `node`) is provided by the Nix dev shell.

```bash
# 1. Enter the toolchain (provides dotnet 9 + bun + node)
nix develop

# 2. Start infra + seed test data (Mongo, RabbitMQ, .env, seeded owner user)
bash dev/up.sh

# 3a. Backend  → https://localhost:7101
dotnet run --launch-profile https

# 3b. Frontend → https://localhost:5173    (second shell, inside `nix develop`)
cd GuildedThorn.com-Frontend && bun run dev
```

Open **https://localhost:5173** and log in with the seeded owner account:

```
username: thorn
password: 12345
```

> **Use the `5173` (Vite) URL during development**, not `7101`. Vite serves your
> live code with hot-reload and proxies `/api`, `/images`, and the SignalR hubs
> to the backend. The `7101` URL serves the last `bun run build` output from `wwwroot/`.

Tear down when finished:

```bash
bash dev/down.sh        # removes the gt-dev-mongo / gt-dev-rabbit containers
```

`dev/up.sh` starts `mongo:8` and `rabbitmq:4-management`, writes a dev `.env` with a generated `Jwt__Key` (kept if it already exists), and seeds Mongo via `dev/seed.js` (an `owner` user, sample posts, guestbook messages, placeholder gallery images). It's idempotent.

---

## Configuration

Config is read from `Resources/config.json` (optional) and overlaid with environment variables / `.env` via DotNetEnv. Use the `Section__Key` double-underscore convention for env vars.

> ⚠️ **`Resources/config.json` is gitignored** because it holds secrets. In production, supply everything via environment variables (e.g. a sops-nix / agenix secrets file) — the app boots fine with no `config.json` on disk.

| Key                               | Purpose                                              |
| --------------------------------- | ---------------------------------------------------- |
| `MongoDB__ConnectionString`       | MongoDB connection string                            |
| `MongoDB__DatabaseName`           | Database name                                        |
| `RabbitMQ__HostName/Username/Password` | RabbitMQ connection                             |
| `Jwt__Key`                        | Base64-encoded HMAC-SHA256 signing key               |
| `Jwt__Issuer` / `Jwt__Audience`   | JWT issuer / audience                                |
| `Spotify__ClientId/ClientSecret/RedirectUri` | Spotify OAuth                             |
| `Loki__Uri`                       | Grafana Loki endpoint                                |
| `WebPush__PublicKey/PrivateKey/Subject` | VAPID keys for Web Push                         |
| `Fido2__ServerDomain`             | WebAuthn RP ID (e.g. `guildedthorn.com`)             |
| `Fido2__Origins`                  | Allowed WebAuthn origins (e.g. `https://guildedthorn.com`) |

---

## Architecture

### Backend

- **`Program.cs`** wires services + middleware: optional `.env`/`config.json`, JWT bearer (cookie-sourced), MongoDB, RabbitMQ, SignalR, WebAuthn, Serilog → Loki. The pipeline adds **forwarded headers**, **HSTS** + a **CSP / security-header** layer, **rate limiting**, a real SPA-aware **404** fallback, and a **`/health`** endpoint.
- **Auth** — a JWT is issued on login (password or WebAuthn) and stored as an HttpOnly, `Secure`, `SameSite=Strict` cookie. WebAuthn ceremonies live in `WebAuthnController`; credentials persist in Mongo; users may enroll keys for passwordless login or as a required second factor.
- **Hardening** — per-IP rate limits on `login`/`register`/`contact`; CSP (`script-src 'self'`, no inline JS), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`; the `/auth/me` response is projected so it never leaks the password hash.

#### API controllers (`/api/[controller]`)

| Controller       | Responsibility                                                        |
| ---------------- | --------------------------------------------------------------------- |
| `Auth`           | Login (JWT cookie, optional 2FA gate), register, logout, `/me`        |
| `WebAuthn`       | FIDO2 register/assert ceremonies, key management, 2FA toggle          |
| `User`           | User profile data + updates                                          |
| `Blog`           | Post CRUD, search/tags, paginated listing, RSS (create = owner)       |
| `Gallery`        | Image CRUD + EXIF; files saved to `wwwroot/images/gallery/`           |
| `GuestBook`      | One message per user; RabbitMQ publish; owner ban/delete              |
| `Contact`        | Public message submit + owner-only inbox                             |
| `Github`         | Proxies the GitHub API for profile info + pinned/recent repos         |
| `Spotify`        | OAuth flow + top artists                                              |
| `Chat`           | REST send into the SignalR chat                                       |
| `Radio`          | Radio metadata / now-playing                                         |
| `StreamSchedule` | Stream schedule entries                                              |
| `Push`           | Web Push (VAPID) subscription management                             |

### Frontend

- **Entry**: `src/main.tsx` wraps the app in an `ErrorBoundary`, context providers, then `<BrowserRouter>`.
- **Routing** (`src/routes/AppRoutes.tsx`): public routes render in `<MainLayout>`; protected routes wrap with `<ProtectedRouter>` (redirects to `/login` when unauthenticated). A lazy `Suspense` + code-splitting keeps per-route JS small.
- **Auth state** (`src/components/AuthContext.tsx`): hydrates from `/api/user/me` on mount; use the `useAuth()` hook.
- **API calls** (`src/backend/api.ts`): relative URLs (proxied in dev, same-origin in prod); authenticated calls pass `credentials: "include"`.
- **SEO**: a dependency-free `<Seo>` component sets per-route `<title>` + Open Graph/Twitter tags; `robots.txt` + `sitemap.xml` ship in `public/`.

---

## Testing

```bash
# Backend (xUnit; integration tests need Docker for Testcontainers)
dotnet test Tests/GuildedThorn.Tests.csproj
dotnet test --filter "FullyQualifiedName!~Integration"   # unit only, no Docker

# Frontend (Vitest + Testing Library)
cd GuildedThorn.com-Frontend && bun run test
```

- **Backend** — unit tests for the JWT issuer, WebAuthn challenge store, and chat moderation; **Testcontainers** integration tests boot the real app against an ephemeral MongoDB to verify the auth flow, the `passwordHash` projection, the 2FA lockout guard, and SPA 404/200 routing. Integration tests auto-skip when no Docker daemon is present.
- **Frontend** — Vitest + React Testing Library cover pure utilities (`cn`, frontmatter, theme) and components (`ProtectedRouter`, `AuthContext`, `LoginForm`, `ThemeToggle`).
- **CI** (`.github/workflows/ci.yml`) builds and tests both halves on every push/PR.

---

## Production build & deployment

### Docker

```bash
docker build -t guildedthorn .   # Multi-stage: bun build → dotnet publish → runtime
```

### Nix (reproducible build)

The flake builds the frontend and backend without Docker or external registries.

```bash
nix build            # Build the app (.#default)
nix run              # Build and run
```

Regenerate pinned hashes when dependencies change:

```bash
# Frontend (after editing the lockfile)
nix run nixpkgs#prefetch-npm-deps -- GuildedThorn.com-Frontend/package-lock.json   # → npmDepsHash

# Backend (after changing NuGet deps)
nix build .#default.passthru.fetch-deps -o fetch-deps && ./fetch-deps deps.json
```

### NixOS module

The flake exposes `nixosModules.default` → a `services.guildedthorn` systemd unit running under a `DynamicUser`, with a writable content root in `StateDirectory` so gallery uploads persist across redeploys.

```nix
services.guildedthorn = {
  enable = true;
  port = 8080;                                          # put a reverse proxy in front
  environmentFile = "/run/secrets/guildedthorn.env";    # via sops-nix / agenix
};
```

### Going to production

Run behind a reverse proxy (e.g. **Caddy** for automatic TLS + WebSocket pass-through). Set `ASPNETCORE_ENVIRONMENT=Production`, real HTTPS (required for WebAuthn + `Secure` cookies), the `Fido2__*` keys for your domain, and supply every secret via the `environmentFile`. WebAuthn and the auth cookie will not work over plain HTTP.

---

## License

Personal project — all rights reserved unless noted otherwise.
