{
  description = "GuildedThorn.com — ASP.NET Core 9 backend + React/Vite frontend";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
  let
    systems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
    forAllSystems = nixpkgs.lib.genAttrs systems;
  in
  {
    packages = forAllSystems (system:
      let
        pkgs = import nixpkgs { inherit system; };

        frontend = pkgs.buildNpmPackage {
          pname = "guildedthorn-frontend";
          version = "0.0.0";
          src = ./GuildedThorn.com-Frontend;

          # Regenerate after changing package-lock.json:
          #   nix run nixpkgs#prefetch-npm-deps -- GuildedThorn.com-Frontend/package-lock.json
          npmDepsHash = "sha256-z9YxUQKRNHV62tK5A1Y7rzB7sQQ7TMlhwJPTnNh3h5A=";

          # vite.config.ts writes to ../wwwroot (one level above the source root)
          installPhase = ''
            runHook preInstall
            cp -r ../wwwroot $out
            runHook postInstall
          '';
        };

        backend = pkgs.buildDotnetModule {
          pname = "guildedthorn";
          version = "1.0.0";
          src = ./.;

          projectFile = "GuildedThorn.com.csproj";

          # Regenerate with:
          #   nix build .#default.passthru.fetch-deps -o fetch-deps
          #   ./fetch-deps deps.json
          nugetDeps = ./deps.json;

          dotnet-sdk = pkgs.dotnetCorePackages.sdk_9_0_3xx;
          dotnet-runtime = pkgs.dotnetCorePackages.aspnetcore_9_0;

          # The frontend is built by Nix (see above), not by the csproj's
          # bun Exec target.
          dotnetFlags = [ "-p:SkipFrontendBuild=true" ];

          executables = [ "GuildedThorn.com" ];

          # The apphost is named after the assembly, not pname — point `nix run`
          # (and `program` consumers) at the real binary.
          meta.mainProgram = "GuildedThorn.com";

          postInstall = ''
            mkdir -p $out/lib/guildedthorn/wwwroot
            cp -r ${frontend}/. $out/lib/guildedthorn/wwwroot/
          '';
        };
      in {
        inherit frontend;
        default = backend;
      }
    );

    nixosModules.default = { config, lib, pkgs, ... }:
      let
        cfg = config.services.guildedthorn;
        appDir = "${cfg.package}/lib/guildedthorn";
      in {
        options.services.guildedthorn = {
          enable = lib.mkEnableOption "GuildedThorn.com web app";

          package = lib.mkOption {
            type = lib.types.package;
            default = self.packages.${pkgs.stdenv.hostPlatform.system}.default;
            description = "The GuildedThorn package to run.";
          };

          port = lib.mkOption {
            type = lib.types.port;
            default = 8080;
            description = "Local port the app listens on (put a reverse proxy in front).";
          };

          environmentFile = lib.mkOption {
            type = lib.types.nullOr lib.types.path;
            default = null;
            description = ''
              EnvironmentFile with secrets (Jwt__Key, MongoDB__ConnectionString,
              RabbitMQ__Password, Spotify__ClientSecret, ...). Use sops-nix or
              agenix to provision it.
            '';
          };
        };

        config = lib.mkIf cfg.enable {
          systemd.services.guildedthorn = {
            description = "GuildedThorn.com web app";
            wantedBy = [ "multi-user.target" ];
            wants = [ "network-online.target" ];
            after = [ "network-online.target" ];

            environment = {
              ASPNETCORE_URLS = "http://127.0.0.1:${toString cfg.port}";
              ASPNETCORE_ENVIRONMENT = "Production";
            };

            # The app resolves wwwroot/ and Resources/config.json relative to
            # its working directory, and gallery uploads must be writable, so
            # assemble a writable content root in the state directory. Copying
            # never deletes, so uploaded gallery images survive redeploys.
            preStart = ''
              mkdir -p "$STATE_DIRECTORY/wwwroot/images/gallery" "$STATE_DIRECTORY/Resources"
              # Drop stale top-level build files (e.g. a sitemap.xml that's since
              # moved to a controller) so they can't shadow app routes. Only the
              # top level — subdirectories are left alone so uploaded avatars
              # (images/avatars) survive redeploys.
              find "$STATE_DIRECTORY/wwwroot" -maxdepth 1 -type f -delete
              cp -r --no-preserve=mode,ownership ${appDir}/wwwroot/. "$STATE_DIRECTORY/wwwroot/"
              if [ ! -e "$STATE_DIRECTORY/Resources/config.json" ]; then
                cp --no-preserve=mode,ownership ${appDir}/Resources/config.json "$STATE_DIRECTORY/Resources/"
              fi
            '';

            serviceConfig = {
              ExecStart = "${cfg.package}/bin/GuildedThorn.com";
              WorkingDirectory = "/var/lib/guildedthorn";
              StateDirectory = "guildedthorn";
              DynamicUser = true;
              Restart = "on-failure";
              RestartSec = 5;
            } // lib.optionalAttrs (cfg.environmentFile != null) {
              EnvironmentFile = cfg.environmentFile;
            };
          };
        };
      };

    devShells = forAllSystems (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in {
        default = pkgs.mkShell {
          name = "dotnet9-shell";

          buildInputs = [
            pkgs.dotnetCorePackages.sdk_9_0_3xx
            pkgs.git
            pkgs.nuget
            pkgs.bind
            pkgs.bun
            pkgs.nodejs_24
            pkgs.mkcert      # locally-trusted dev TLS certs for the Vite dev server
            pkgs.nssTools    # certutil — lets `mkcert -install` trust the CA in Firefox
          ];

          shellHook = ''
            echo "🚀 Entered .NET 9 dev shell"
            dotnet --version
          '';
        };
      }
    );
  };
}
