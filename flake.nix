{
  /****
   * A thoroughly commented Nix flake for a Node.js / TypeScript dev environment.
   *
   * Goals
   * -----
   * - Pin `nixpkgs` for reproducible toolchains (node, pnpm/yarn via corepack, TS, linters).
   * - Provide a rich `devShell` usable with `nix develop` on Linux and macOS (Intel/ARM).
   * - Include native build prerequisites for `node-gyp` (python, pkg-config, compilers, OpenSSL).
   * - Add common JS/TS tooling: typescript, ts-node, eslint, prettier, vite, vitest/jest.
   * - Offer handy `apps` for `nix run` (install/dev/test/lint/fmt/build/clean).
   *
   * Notes on reproducibility
   * ------------------------
   * - This flake pins *tooling*, not your npm/pnpm/yarn dependency tree. For fully
   *   offline CI builds, consider a Nix-based package generator (e.g. `pnpm2nix`,
   *   `yarn2nix`) or vendoring. For day-to-day dev, a lockfile + pinned nixpkgs is
   *   typically sufficient.
   ****/

  description = "Reproducible Node/TypeScript development shell with common tooling";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.05"; # pin a branch or commit for max determinism
    flake-parts.url = "github:hercules-ci/flake-parts";
  };

  outputs = inputs@{ self, nixpkgs, flake-parts, ... }:
    flake-parts.lib.mkFlake { inherit inputs; } ({ withSystem, ... }: {
      systems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];

      perSystem = { system, ... }:
        let
          pkgs = import nixpkgs {
            inherit system;
            config = { allowUnfree = false; };
          };

          # Choose Node LTS. Fallback ensures flake stays evaluable across channels.
          nodejs = pkgs.nodejs_22 or pkgs.nodejs_20 or pkgs.nodejs;

          # Common JS/TS tools (CLI variants preferred so editors can find them in PATH).
          typescript   = pkgs.nodePackages.typescript;
          tsnode       = pkgs.nodePackages.ts-node;
          eslint       = pkgs.nodePackages.eslint;
          prettier     = pkgs.nodePackages.prettier;
          vite         = pkgs.nodePackages.vite or pkgs.nodePackages_latest.vite or null;
          vitest       = pkgs.nodePackages.vitest or pkgs.nodePackages_latest.vitest or null;
          jest         = pkgs.nodePackages.jest or null;

          # Native build prerequisites for node-gyp and popular native addons.
          nativeBuildInputs = with pkgs; [
            python3
            pkg-config
            gcc
            gnumake
            libtool
            autoconf
            automake
            cmake
            # Often needed by deps like `bcrypt`, `node-rdkafka`, `better-sqlite3`.
            openssl
            sqlite
            zlib
          ] ++ pkgs.lib.optionals pkgs.stdenv.isDarwin [
            # Xcode CLT provides most bits on macOS, but keep these for consistency.
            pkgs.darwin.cctools
          ];

          devUtils = with pkgs; [ git bashInteractive which coreutils gnugrep jq curl ];

          # Helper to optionally include a package only if it exists.
          maybe = p: if p == null then [ ] else [ p ];
        in {
          formatter = pkgs.nixfmt-rfc-style or pkgs.nixfmt; # used by `nix fmt`

          devShells.default = pkgs.mkShell {
            name = "node-dev-shell";
            buildInputs = [
              nodejs
              typescript
              tsnode
              eslint
              prettier
            ]
            ++ maybe vite
            ++ maybe vitest
            ++ maybe jest
            ++ nativeBuildInputs
            ++ devUtils;

            # Environment to play nicely with corepack, pnpm/yarn, and local caches.
            shellHook = ''
              echo "💡 Node dev shell active for ${system} — using $(node -v)"

              # Keep caches within the repo to avoid polluting $HOME and ease cleanup.
              export NPM_CONFIG_CACHE="$PWD/.npm-cache"
              export YARN_CACHE_FOLDER="$PWD/.yarn-cache"

              # Ensure node-gyp can find Python and pkg-config.
              export npm_config_python=${pkgs.python3}/bin/python3
              export PKG_CONFIG_PATH=${pkgs.openssl.dev}/lib/pkgconfig:${pkgs.sqlite.dev}/lib/pkgconfig:${pkgs.zlib.dev}/lib/pkgconfig

              # Enable Corepack (bundled with Node >=16) and install shims locally.
              export COREPACK_ENABLE=1
              mkdir -p "$PWD/.corepack/bin"
              corepack enable --install-directory "$PWD/.corepack" >/dev/null 2>&1 || true
              export PATH="$PWD/.corepack:$PATH"

              # Prefer local versions from node_modules/.bin when present.
              export PATH="$PWD/node_modules/.bin:$PATH"
            '';
          };

          # Handy `nix run` apps to standardize routine commands across machines/CI.
          apps = {
            install = {
              type = "app";
              program = toString (pkgs.writeShellScript "js-install" ''
                set -euo pipefail
                if [ -f pnpm-lock.yaml ]; then
                  exec corepack pnpm install --frozen-lockfile
                elif [ -f yarn.lock ]; then
                  exec corepack yarn install --frozen-lockfile
                else
                  exec corepack npm ci
                fi
              '');
            };

            dev = {
              type = "app";
              program = toString (pkgs.writeShellScript "js-dev" ''
                set -euo pipefail
                if grep -q '"dev"' package.json 2>/dev/null; then
                  exec corepack npm run dev
                elif command -v vite >/dev/null 2>&1; then
                  exec vite
                else
                  echo "No dev script found." >&2; exit 1
                fi
              '');
            };

            test = {
              type = "app";
              program = toString (pkgs.writeShellScript "js-test" ''
                set -euo pipefail
                if grep -q '"test"' package.json 2>/dev/null; then
                  exec corepack npm test --silent
                elif command -v vitest >/dev/null 2>&1; then
                  exec vitest run
                elif command -v jest >/dev/null 2>&1; then
                  exec jest
                else
                  echo "No test runner found." >&2; exit 1
                fi
              '');
            };

            lint = {
              type = "app";
              program = toString (pkgs.writeShellScript "js-lint" ''
                set -euo pipefail
                if command -v eslint >/dev/null 2>&1; then
                  exec eslint .
                else
                  echo "eslint not available." >&2; exit 1
                fi
              '');
            };

            fmt = {
              type = "app";
              program = toString (pkgs.writeShellScript "js-fmt" ''
                set -euo pipefail
                if command -v prettier >/dev/null 2>&1; then
                  exec prettier --write .
                else
                  echo "prettier not available." >&2; exit 1
                fi
              '');
            };

            build = {
              type = "app";
              program = toString (pkgs.writeShellScript "js-build" ''
                set -euo pipefail
                if grep -q '"build"' package.json 2>/dev/null; then
                  exec corepack npm run build
                elif command -v vite >/dev/null 2>&1; then
                  exec vite build
                else
                  echo "No build script found." >&2; exit 1
                fi
              '');
            };

            clean = {
              type = "app";
              program = toString (pkgs.writeShellScript "js-clean" ''
                set -euo pipefail
                rm -rf node_modules .pnpm-store .npm-cache .yarn-cache .corepack dist build .turbo || true
                echo "Cleaned JS caches and build artifacts."
              '');
            };
          };

          # Minimal `flake check` example: format this flake. For fully reproducible
          # JS checks, add a Nixified dependency set or vendor your deps.
          checks.nixfmt = pkgs.runCommand "check-nixfmt" { buildInputs = [ (pkgs.nixfmt-rfc-style or pkgs.nixfmt) ]; } ''
            ${pkgs.lib.getExe (pkgs.nixfmt-rfc-style or pkgs.nixfmt)} ${self}/flake.nix
            touch $out
          '';
        };
    });
}
