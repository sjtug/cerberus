{ pkgs, ... }:

{
  # https://devenv.sh/packages/
  packages = with pkgs; [
    git
    xcaddy
    templ
    esbuild
    golangci-lint
    tailwindcss_4
    pngquant
    wasm-pack
  ];

  # https://devenv.sh/languages/
  languages.go = {
    enable = true;
    enableHardeningWorkaround = true;
  };

  tasks =
    let
      tailwindcss = "${pkgs.tailwindcss_4}/bin/tailwindcss";
      find = "${pkgs.findutils}/bin/find";
      xargs = "${pkgs.findutils}/bin/xargs";
      pngquant = "${pkgs.pngquant}/bin/pngquant";
      templ = "${pkgs.templ}/bin/templ";
      wasm-pack = "${pkgs.wasm-pack}/bin/wasm-pack";
      pnpm = "${pkgs.nodePackages.pnpm}/bin/pnpm";
      pnpx = "${pkgs.nodePackages.pnpm}/bin/pnpx";
      golangci-lint = "${pkgs.golangci-lint}/bin/golangci-lint";
      node = "${pkgs.nodejs}/bin/node";
    in
    {
      "css:build".exec = "${tailwindcss} -i ./web/global.css -o ./web/dist/global.css --minify";
      "wasm:build".exec = ''
        ${wasm-pack} build --target web ./pow --no-default-features
      '';
      "js:install".exec = ''
        cd web/js
        ${pnpm} install
      '';
      "js:bundle" = {
        exec = ''
          cd web/js
          ${pnpx} parcel build --dist-dir ../dist/
        '';
        after = [
          "wasm:build"
          "js:install"
          "js:icu"
        ];
      };
      "img:dist".exec = ''
        mkdir -p ./web/dist/img
        ${find} ./web/img -maxdepth 1 -name "*.png" -printf "%f\n" | ${xargs} -n 1 sh -c '${pngquant} --force --strip --quality 0-20 --speed 1 ./web/img/$0 -o ./web/dist/img/$0'
      '';
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
        "css:build"
        "js:bundle"
        "img:dist"
        "go:codegen"
      ];
      "go:lint" = {
        exec = "${golangci-lint} run";
        after = [ "go:codegen" ];
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
