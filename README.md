# Cerberus

<center>
   <img width=256 src="./web/img/mascot-puzzle.png" alt="A smiling chibi dark-skinned anthro jackal with brown hair and tall ears looking victorious with a thumbs-up" />
</center>

Cerberus guards the gates of open source infrastructure using a sha256 PoW challenge to protect them from unwanted traffic. It provides a Caddy handler that can be applied to existing Caddy servers.

This project started as a Caddy port of [Anubis](https://github.com/TecharoHQ/anubis/) and is now a standalone project. While Anubis focuses on protecting websites from AI scrapers, Cerberus serves a different purpose: it's designed as a last line of defense to protect volunteer-run open source infrastructure from aggressive PCDN attacks. We would do whatever it takes to stop them, even if it means sacrificing a few innocent cats.

For now, the project is still mostly a re-implementation of Anubis, but it's actively developed, and will eventually employ more aggressive techniques. You can check the [Roadmap](#roadmap) section for more details.

## Usage

1. Install Caddy with the plugin:
   ```bash
   caddy add-package github.com/sjtug/cerberus
   ```
2. Add the handler directive to your Caddyfile. Refer to the [Caddyfile](Caddyfile) for an example configuration.

## Comparison with Anubis

- Anubis is a standalone server that can be used with any web server, while Cerberus is a Caddy plugin.
- No builtin anti-AI rules: use caddy matchers instead.
- Highly aggressive challenge policy: users need to solve a challenge for every few requests and new challenges are generated per request. For further details, see the [Aggressive challenge policy](#aggressive-challenge-policy) section.
- Can be set up to block IP subnets if there are too many failed challenge attempts to prevent abuse.
- ~~No custom UI or anime girls.~~ Now with an AI-generated placeholder mascot lol

## Configuration

Check [Caddyfile](Caddyfile) for an example configuration.

## Roadmap

- [x] More frequent challenges (each solution only grants a few accesses)
- [x] More frequent challenge rotation (per week -> per request)
- [ ] Configurable challenge difficulty for each route
- [ ] "block_only" mode to serve as a blocklist even a route is not protected by PoW challenge
- [x] ~~RandomX PoW~~ unacceptably slow. Use blake3 (wasm) instead.
- [ ] I18n
- [ ] Non-AI mascot

## Aggressive challenge policy

This is the first divergence from Anubis. Now, we require a user to repeat the challenge every few accesses. This is to ensure that we waste an attacker's computational resources to the extent that it becomes non-sustainable for the attacker to perform the attack.

This will surely slow down legitimate users, but we believe that this is a necessary evil to protect our infrastructure. After all, a slow down is better than a complete outage.

## Development

If you modified any web asset, you need to run the following command to build the dist files:
```bash
$ devenv tasks run dist:build
```

Please run tests and lints before submitting a PR:
```bash
$ direnv test # or go test
$ golangci-lint run
```