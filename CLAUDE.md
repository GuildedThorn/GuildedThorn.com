# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio website with an ASP.NET Core 10 backend and a React + TypeScript + Vite frontend. The backend serves the compiled frontend as static files from `wwwroot/`.

## Commands

### Backend (run from repo root)
```bash
dotnet run                    # Start the backend (http/https on configured ports)
dotnet build                  # Build only
dotnet publish -c Release -o ./publish /p:SkipFrontendBuild=true
```

### Frontend (run from `GuildedThorn.com-Frontend/`)
```bash
bun install                   # Install dependencies
bun run dev                   # Dev server at https://localhost:5173
bun run build                 # Build → outputs to ../wwwroot (the .NET static files dir)
bun run lint                  # ESLint
```

### Docker
```bash
docker build -t guildedthorn .   # Multi-stage: bun build → dotnet publish → runtime
```

### Nix dev shell
```bash
nix develop   # Provides dotnet SDK 9, bun, nodejs_24, git, nuget
```

## Architecture

### Backend (ASP.NET Core 10)

**Entry point**: `Program.cs` — loads `.env` via DotNetEnv, merges `Resources/config.json`, sets up all services and middleware.

**Services** (all singletons unless noted):
- `MongoDbService` — wraps MongoDB collections (Users, Messages, GuestBookMessages, BlogPosts, GalleryImages)
- `RabbitMqService` — publishes guestbook messages to `guestbook_messages` queue
- `ChatService` — scoped; used with SignalR
- `RadioService` — stub, not yet implemented
- `ChatHub` — SignalR hub at `/chathub`, requires auth

**Controllers** (`/api/[controller]` prefix):
- `AuthController` — login (JWT cookie), register, logout, `/me`, `/check`
- `UserController` — user data updates
- `BlogController` — CRUD for blog posts (create requires `owner` role)
- `GalleryController` — CRUD for gallery images; files saved to `wwwroot/images/gallery/`
- `GuestBookController` — one message per user (enforced); publishes to RabbitMQ on post
- `GithubController` — proxies GitHub API for profile info and pinned repos
- `SpotifyController` — OAuth flow + top artists (tokens stored in-memory, not persistent)
- `ChatController` — REST endpoint to send SignalR messages
- `RadioController` — stub

**Auth**: JWT issued on login, stored as an HttpOnly `Secure SameSite=Strict` cookie named `token`. The bearer event reads it from cookies automatically. Two roles: `owner` and `user`. Policy `PrivilegedOnly` requires either role.

**Required configuration** (via `.env` or `Resources/config.json`):
- `MongoDB:ConnectionString`, `MongoDB:DatabaseName`
- `RabbitMQ:HostName`, `RabbitMQ:Username`, `RabbitMQ:Password`
- `Jwt:Key` (base64-encoded HMAC-SHA256 key), `Jwt:Issuer`, `Jwt:Audience`
- `Spotify:ClientId`, `Spotify:ClientSecret`, `Spotify:RedirectUri`
- `Loki:Uri` (Grafana Loki endpoint; required even in dev — defaults in `Resources/config.json` to `http://localhost:3100`)

### Frontend (React + TypeScript + Vite + Tailwind CSS 4)

**Entry**: `src/main.tsx` wraps the app in `<AuthProvider>` then `<BrowserRouter>`.

**Path aliases** (configured in `vite.config.ts`):
- `@components` → `src/components`
- `@pages` → `src/pages`
- `@routes` → `src/routes`
- `@layouts` → `src/layouts`
- `@backend` → `src/backend`
- `@styles` → `src/styles`
- `@lib` → `src/lib`
- `@assets` → `src/assets`

**Routing** (`src/routes/AppRoutes.tsx`): Public routes are inside `<MainLayout>`; protected routes additionally wrap with `<ProtectedRouter>` which redirects to `/login` if not authenticated.

**Auth state** (`src/components/AuthContext.tsx`): `AuthProvider` calls `/api/user/me` on mount to hydrate `{ isAuthenticated, user, loading }`. Use `useAuth()` hook anywhere inside the provider.

**API calls** (`src/backend/api.ts`): All fetches use relative URLs (proxied in dev; served from same origin in prod). Always pass `credentials: "include"` for authenticated endpoints.

**Build output**: `bun run build` writes to `../wwwroot` (the .NET project's static files root), so building the frontend updates what the backend serves.

### Dev workflow (full-stack)

In development the .NET SPA proxy (configured in `.csproj`) expects the Vite dev server at `https://localhost:5173`. Run `dotnet run` and `bun run dev` concurrently; the backend proxies frontend requests during development.

For production, build the frontend first (`bun run build`) then run `dotnet run` (or publish).
