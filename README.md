# GuildedThorn.com

My personal portfolio site — an **ASP.NET Core 9** backend serving a **React + TypeScript + Vite** frontend. The backend exposes a JSON API (`/api/*`) and a SignalR hub, and serves the compiled frontend as static files from `wwwroot/`.

---

## Tech stack

| Layer        | Tech                                                                 |
| ------------ | ------------------------------------------------------------------- |
| Frontend     | React 19, TypeScript, Vite 6, Tailwind CSS 4, React Router          |
| Backend      | ASP.NET Core 9, JWT auth (HttpOnly cookie), SignalR                 |
| Data / infra | MongoDB, RabbitMQ, Grafana Loki (logging)                           |
| Tooling      | Nix flake (dev shell + reproducible build), bun, Docker             |

---

## Repository layout

```
.
├── Program.cs                  # Backend entry point, DI + middleware setup
├── Controllers/                # API controllers (/api/[controller])
├── Models/                     # MongoDB document models
├── Services/                   # Mongo, RabbitMQ, Chat, Radio services + SignalR hub
├── Resources/config.json       # Default config, merged with .env at startup
├── GuildedThorn.com-Frontend/  # React + Vite app (builds into ../wwwroot)
├── wwwroot/                    # Compiled frontend + uploaded gallery images
├── dev/                        # Local dev environment scripts (up/down/seed)
├── flake.nix                   # Nix dev shell, package build, NixOS module
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

# 3a. Backend  → https://localhost:7101   (also http://localhost:5232)
dotnet run --launch-profile https

# 3b. Frontend → http://localhost:5173    (run in a second shell, inside `nix develop`)
cd GuildedThorn.com-Frontend && bun run dev
```

Then open **http://localhost:5173** and log in with the seeded owner account:

```
username: thorn
password: 12345
```

> **Use the `5173` (Vite) URL during development**, not `7101`. Vite serves your
> live code with hot-reload; its dev server proxies `/api`, `/images`, and the
> SignalR hub to the backend on `7101` (see `server.proxy` in `vite.config.ts`).
> The `7101` URL serves the last `bun run build` output from `wwwroot/`.

Tear down when finished:

```bash
bash dev/down.sh        # removes the gt-dev-mongo / gt-dev-rabbit containers
```

### What `dev/up.sh` does

- Starts `mongo:8` (`:27017`) and `rabbitmq:4-management` (`:5672`, management UI `:15672`) containers.
- Writes a development `.env` with a freshly generated `Jwt__Key` (skipped if `.env` already exists).
- Seeds MongoDB via `dev/seed.js`: one **owner** user (`thorn` / `12345`), sample blog posts, a markdown stress-test post, guestbook messages, and placeholder gallery images.

The script is idempotent — re-running recreates containers and re-seeds to a clean, known state while leaving your `.env` untouched.

---

## Configuration

Config is loaded from `Resources/config.json`, then overlaid with environment
variables / `.env` (via DotNetEnv). Use the `Section__Key` double-underscore
convention for env vars.

| Key                          | Purpose                                            |
| ---------------------------- | -------------------------------------------------- |
| `MongoDB__ConnectionString`  | MongoDB connection string                          |
| `MongoDB__DatabaseName`      | Database name                                      |
| `RabbitMQ__HostName`         | RabbitMQ host                                      |
| `RabbitMQ__Username`         | RabbitMQ username                                  |
| `RabbitMQ__Password`         | RabbitMQ password                                  |
| `Jwt__Key`                   | Base64-encoded HMAC-SHA256 signing key             |
| `Jwt__Issuer` / `Jwt__Audience` | JWT issuer / audience                           |
| `Spotify__ClientId`          | Spotify OAuth client id                            |
| `Spotify__ClientSecret`      | Spotify OAuth client secret                        |
| `Spotify__RedirectUri`       | Spotify OAuth redirect URI                         |
| `Loki__Uri`                  | Grafana Loki endpoint (defaults to `http://localhost:3100`) |

`dev/up.sh` generates a working `.env` for local use, so you normally don't set these by hand in development.

---

## Common commands

### Backend (from repo root)

```bash
dotnet run --launch-profile https   # Run on https://localhost:7101 (+ http://localhost:5232)
dotnet build                        # Build only
dotnet publish -c Release -o ./publish /p:SkipFrontendBuild=true
```

### Frontend (from `GuildedThorn.com-Frontend/`)

```bash
bun install     # Install dependencies
bun run dev     # Vite dev server at http://localhost:5173
bun run build   # Production build → outputs to ../wwwroot
bun run lint    # ESLint
```

`bun run build` writes to `../wwwroot`, the .NET project's static-files root, so building the frontend updates what the backend serves.

---

## Architecture

### Backend

- **`Program.cs`** wires up services and middleware: loads `.env`, merges `Resources/config.json`, configures JWT auth, MongoDB, RabbitMQ, SignalR, and Loki logging.
- **Services** (singletons unless noted): `MongoDbService` (collection access), `RabbitMqService` (publishes guestbook messages to the `guestbook_messages` queue), `ChatService` (scoped, used with SignalR), `RadioService` (stub), and `ChatHub` (SignalR hub at `/chathub`, requires auth).
- **Auth**: a JWT is issued on login and stored as an HttpOnly, `Secure`, `SameSite=Strict` cookie named `token`. Two roles — `owner` and `user`. The `PrivilegedOnly` policy requires either role; owner-only actions (creating posts, uploading gallery images) require the `owner` role.

#### API controllers (`/api/[controller]`)

| Controller   | Responsibility                                                        |
| ------------ | --------------------------------------------------------------------- |
| `Auth`       | Login (sets JWT cookie), register, logout, `/me`, `/check`            |
| `User`       | User profile data (`/me`, updates)                                    |
| `Blog`       | Blog post CRUD + paginated/searchable listing (create requires owner) |
| `Gallery`    | Gallery image CRUD; files saved to `wwwroot/images/gallery/`          |
| `GuestBook`  | One message per user (enforced); publishes to RabbitMQ on post        |
| `Github`     | Proxies the GitHub API for profile info and pinned repos              |
| `Spotify`    | OAuth flow + top artists (tokens held in-memory)                      |
| `Chat`       | REST endpoint to send SignalR messages                                |
| `Radio`      | Stub, not yet implemented                                             |

### Frontend

- **Entry**: `src/main.tsx` wraps the app in `<AuthProvider>` then `<BrowserRouter>`.
- **Routing** (`src/routes/AppRoutes.tsx`): public routes render inside `<MainLayout>`; protected routes additionally wrap with `<ProtectedRouter>`, which redirects to `/login` when unauthenticated.
- **Auth state** (`src/components/AuthContext.tsx`): `AuthProvider` calls `/api/user/me` on mount to hydrate `{ isAuthenticated, user, loading }`; use the `useAuth()` hook anywhere inside the provider.
- **API calls** (`src/backend/api.ts`): all fetches use relative URLs (proxied in dev, same-origin in prod). Authenticated calls pass `credentials: "include"`.
- **Path aliases** (`vite.config.ts`): `@components`, `@pages`, `@routes`, `@layouts`, `@backend`, `@styles`, `@lib`, `@assets`.

---

## Production build & deployment

### Docker

```bash
docker build -t guildedthorn .   # Multi-stage: bun build → dotnet publish → runtime
```

### Nix (reproducible build)

The flake builds the frontend (`buildNpmPackage`) and backend (`buildDotnetModule`) without Docker or external registries.

```bash
nix build            # Build the app (.#default)
nix run              # Build and run
```

When dependencies change, regenerate the pinned hashes:

- **Frontend** (after editing `package-lock.json`):
  ```bash
  nix run nixpkgs#prefetch-npm-deps -- GuildedThorn.com-Frontend/package-lock.json
  # → update npmDepsHash in flake.nix
  ```
- **Backend** (after changing NuGet dependencies):
  ```bash
  nix build .#default.passthru.fetch-deps -o fetch-deps
  ./fetch-deps deps.json
  ```

### NixOS module

The flake exposes `nixosModules.default`, which defines a `services.guildedthorn` systemd service running under a `DynamicUser`. It assembles a writable content root in the service's `StateDirectory` so gallery uploads and `Resources/config.json` persist across redeploys.

```nix
services.guildedthorn = {
  enable = true;
  port = 8080;                       # bind a reverse proxy in front
  environmentFile = "/run/secrets/guildedthorn.env";  # provide via sops-nix / agenix
};
```

The `environmentFile` should supply the secrets listed under [Configuration](#configuration) (`Jwt__Key`, `MongoDB__ConnectionString`, `RabbitMQ__Password`, `Spotify__ClientSecret`, …).

---

## Development notes

- The app resolves `wwwroot/` and `Resources/config.json` relative to its working directory; gallery uploads are written under `wwwroot/images/gallery/`.
- Blog and gallery listings support pagination (`?page=&pageSize=`); blog listing also supports a `?search=` query (case-insensitive match on title and content).
- `dotnet run` rebuilds the backend; restart it after backend changes. The frontend hot-reloads automatically under `bun run dev`.
