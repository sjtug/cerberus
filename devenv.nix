{ pkgs, ... }:

{
  # https://devenv.sh/packages/
  packages = with pkgs; [
    git
    xcaddy
    templ
    golangci-lint
    wasm-pack
  ];

  # https://devenv.sh/languages/
  languages.go = {
    enable = true;
    enableHardeningWorkaround = true;
    package = pkgs.go_1_25;
  };

  tasks =
    let
      templ = "${pkgs.templ}/bin/templ";
      wasm-pack = "${pkgs.wasm-pack}/bin/wasm-pack";
      pnpm = "${pkgs.nodePackages.pnpm}/bin/pnpm";
      golangci-lint = let 
        pkg = pkgs.golangci-lint.override {
          buildGoModule = pkgs.buildGo125Module;
        };
      in "${pkg}/bin/golangci-lint";
      node = "${pkgs.nodejs}/bin/node";
    in
    {
      "wasm:build".exec = ''
        PATH=${pkgs.cargo}/bin:${pkgs.rustc}/bin:${pkgs.lld}/bin:$PATH ${wasm-pack} build --target web ./pow --no-default-features
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

  # https://devenv.sh/tests/
  enterTest = ''
    echo "Running tests"
    go test ./...
  '';

  # https://devenv.sh/git-hooks/
  # git-hooks.hooks.shellcheck.enable = true;

  # See full reference at https://devenv.sh/reference/options/
}
