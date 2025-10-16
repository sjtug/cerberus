{ inputs, pkgs, ... }:

{
  overlays = [
    (import inputs.rust-overlay)
  ];

  # https://devenv.sh/packages/
  packages = with pkgs; [
    git
    xcaddy
    templ
    golangci-lint
    wasm-pack
    playwright-test
  ];

  env = {
    PLAYWRIGHT_BROWSERS_PATH = "${pkgs.playwright.passthru.browsers}";
    PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS = "true";
    PLAYWRIGHT_NODEJS_PATH = "${pkgs.nodejs}/bin/node";
  };

  # https://devenv.sh/languages/
  languages.go = {
    enable = true;
    enableHardeningWorkaround = true;
  };

  tasks =
    let
      templ = "${pkgs.templ}/bin/templ";
      wasm-pack = "${pkgs.wasm-pack}/bin/wasm-pack";
      pnpm = "${pkgs.nodePackages.pnpm}/bin/pnpm";
      golangci-lint = "${pkgs.golangci-lint}/bin/golangci-lint";
      node = "${pkgs.nodejs}/bin/node";
      rust-toolchain = pkgs.rust-bin.selectLatestNightlyWith (
        toolchain:
        toolchain.minimal.override {
          extensions = [ "rust-src" ];
          targets = [ "wasm32-unknown-unknown" ];
        }
      );
    in
    {
      "wasm:build".exec = ''
        PATH="${rust-toolchain}/bin:$PATH" ${wasm-pack} build --target web ./pow --no-default-features -Z build-std=panic_abort,std
      '';
      "js:install" = {
        exec = ''
          cd web
          ${pnpm} install
        '';
        after = [ "wasm:build" ];
      };
      "js:bundle" = {
        exec = ''
          cd web
          ${pnpm} run build
        '';
        after = [
          "js:install"
          "js:icu"
        ];
      };
      "go:codegen".exec = "${templ} generate";
      "js:icu" = {
        exec = ''
          cd web/js
          mkdir -p icu
          ${node} convert.js ../../translations icu/compiled.mjs
        '';
        after = [ "js:install" ];
      };
      "dist:clean".exec = "rm -rf ./web/dist";
      "dist:build".after = [
        "js:bundle"
        "go:codegen"
      ];
      "go:lint" = {
        exec = "${golangci-lint} run";
        after = [
          "go:codegen"
        ];
      };
    };

  # tasks = {
  #   "myproj:setup".exec = "mytool build";
  #   "devenv:enterShell".after = [ "myproj:setup" ];
  # };

  # https://devenv.sh/scripts/
  scripts.validate-playwright.exec =
    let
      pnpm = "${pkgs.nodePackages.pnpm}/bin/pnpm";
    in
    ''
      playwrightNpmVersion="$(cd web && ${pnpm} list @playwright/test | grep @playwright/test | awk '{print $2}')"
      echo "❄️ Playwright nix version: ${pkgs.playwright-test.version}"
      echo "📦 Playwright npm version: $playwrightNpmVersion"

      if [ "${pkgs.playwright-test.version}" != "$playwrightNpmVersion" ]; then
          echo "❌ Playwright versions in nix (in devenv.yaml) and npm (in package.json) are not the same! Please adapt the configuration."
      else
          echo "✅ Playwright versions in nix and npm are the same"
      fi

      echo
      env | grep ^PLAYWRIGHT
    '';

  enterShell = ''
    validate-playwright
  '';

  # https://devenv.sh/tests/
  enterTest =
    let
      pnpm = "${pkgs.nodePackages.pnpm}/bin/pnpm";
    in
    ''
      echo "Running Go tests"
      go test ./...

      echo "Running Playwright tests"
      cd web && ${pnpm} exec playwright test
    '';

  # https://devenv.sh/git-hooks/
  # git-hooks.hooks.shellcheck.enable = true;

  # See full reference at https://devenv.sh/reference/options/
}
