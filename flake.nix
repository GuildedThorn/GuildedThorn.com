{
  description = "Dotnet 9 development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
  let
    systems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
    forAllSystems = nixpkgs.lib.genAttrs systems;
  in
  {
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
