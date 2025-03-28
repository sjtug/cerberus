{ pkgs, ... }:

{
  # https://devenv.sh/packages/
  packages = with pkgs; [ git xcaddy templ esbuild golangci-lint ];

  # https://devenv.sh/languages/
  languages.go = {
    enable = true;
    enableHardeningWorkaround = true;
  };

  tasks = {
    "js:bundle".exec = "esbuild js/main.mjs --bundle --minify --outfile=dist/main.js --allow-overwrite";
    "go:codegen".exec = "templ generate";
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
