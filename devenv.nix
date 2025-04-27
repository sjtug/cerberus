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
      pnpm = "${pkgs.nodePackages.pnpm}/bin/pnpm";
      find = "${pkgs.findutils}/bin/find";
      xargs = "${pkgs.findutils}/bin/xargs";
      pngquant = "${pkgs.pngquant}/bin/pngquant";
      templ = "${pkgs.templ}/bin/templ";
      wasm-pack = "${pkgs.wasm-pack}/bin/wasm-pack";
    in
    {
      "css:build".exec = "${tailwindcss} -i ./web/global.css -o ./web/dist/global.css --minify";
      "wasm:build".exec = ''
        ${wasm-pack} build --target web ./pow --no-default-features
      '';
      "js:bundle" = {
        exec = ''
          cd ./web/js
          ${pnpm} i
          ${pnpm} run build
        '';
        after = [ "wasm:build" ];
      };
      "img:dist".exec = ''
        mkdir -p ./web/dist/img
        ${find} ./web/img -maxdepth 1 -name "*.png" -printf "%f\n" | ${xargs} -n 1 sh -c '${pngquant} --force --strip --quality 0-20 --speed 1 ./web/img/$0 -o ./web/dist/img/$0'
      '';
      "go:codegen".exec = "${templ} generate";
      "dist:clean".exec = "rm -rf ./web/dist";
      "dist:build".after = [
        "css:build"
        "js:bundle"
        "img:dist"
        "go:codegen"
      ];
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
