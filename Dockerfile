# ---------------------------
# Multi-stage: frontend -> dotnet build/publish -> runtime
# ---------------------------

# --------------- Frontend builder ---------------
FROM oven/bun:latest AS frontend-builder
ARG FRONTEND_DIR=GuildedThorn.com-Frontend
WORKDIR /app

# Copy package metadata first (for Docker layer cache)
COPY ${FRONTEND_DIR}/package.json ${FRONTEND_DIR}/package-lock.json* ${FRONTEND_DIR}/bun.lock* ./

# Copy the rest of the frontend source
COPY ${FRONTEND_DIR} ./

# If you DO have a bun lockfile and want reproducible builds, restore --frozen-lockfile.
# If not, use plain 'bun install' so the build won't fail when no lockfile is present.
RUN bun install

# Build the Vite app. Ensure package.json has "build": "vite build"
RUN bun run build


# normalize the build output so the next stage can always copy /wwwroot
# - if Vite wrote to /app/dist, copy it into /wwwroot
# - if Vite already wrote into /wwwroot, copy it to make sure /wwwroot exists and has correct content
RUN mkdir -p /wwwroot \
 && if [ -d /app/dist ]; then cp -a /app/dist/. /wwwroot/; fi \
 && if [ -d /wwwroot ] && [ "$(ls -A /wwwroot)" = "" ]; then echo "/wwwroot empty after copy"; fi

# --------------- .NET build + publish ------------v---
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
ARG BACKEND_PROJECT=GuildedThorn.com.csproj
ARG BACKEND_WWWROOT=wwwroot

WORKDIR /src

# Copy and restore only the project file first (cache)
COPY ["${BACKEND_PROJECT}", "./"]
RUN dotnet restore "${BACKEND_PROJECT}"

# Copy all backend source files
COPY . .

# remove any existing project wwwroot
RUN rm -rf /src/${BACKEND_WWWROOT} || true

# copy normalized frontend build into the backend project's wwwroot
COPY --from=frontend-builder /${BACKEND_WWWROOT} /src/${BACKEND_WWWROOT}

# Build
RUN dotnet build "${BACKEND_PROJECT}" -c ${BUILD_CONFIGURATION} -o /app/build

FROM build AS publish
# Skip the csproj frontend Exec target (we already provided prebuilt assets)
RUN dotnet publish "${BACKEND_PROJECT}" -c ${BUILD_CONFIGURATION} -o ./publish /p:UseAppHost=false /p:SkipFrontendBuild=true

# --------------- Final runtime ---------------
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

# Copy published app
COPY --from=publish /src/publish .

ENTRYPOINT ["dotnet", "GuildedThorn.com.dll"]