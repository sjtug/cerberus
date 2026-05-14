# Cerberus

<center>
   <img width=256 src="./web/img/mascot-puzzle.png" alt="A smiling chibi dark-skinned anthro jackal with brown hair and tall ears looking victorious with a thumbs-up" />
</center>

Cerberus guards the gates of open source infrastructure using a sha256 PoW challenge to protect them from unwanted traffic. It provides a Caddy handler that can be applied to existing Caddy servers.

This project started as a Caddy port of [Anubis](https://github.com/TecharoHQ/anubis/) and is now a standalone project. While Anubis focuses on protecting websites from AI scrapers, Cerberus serves a different purpose: it's designed as a last line of defense to protect volunteer-run open source infrastructure from abusive traffic. We would do whatever it takes to stop them, even if it means sacrificing a few innocent cats.

For now, the project is still mostly a re-implementation of Anubis, but it's actively developed, and will eventually employ more aggressive techniques. You can check the [Roadmap](#roadmap) section for more details.

## Usage

### Official Pre-built Binaries

> Sometimes the official binaries are not up to date. In that case please build from source.

1. Install Caddy with the plugin:
   ```bash
   caddy add-package github.com/sjtug/cerberus
   ```
2. Add the handler directive to your Caddyfile. Refer to the [Caddyfile](Caddyfile) for an example configuration.

### Build from Source 

Please build against the **dist** branch or a release tag:

```bash
# Build with a specific version
xcaddy build --with github.com/sjtug/cerberus@v1.0.0

# Or build with the latest dist branch
xcaddy build --with github.com/sjtug/cerberus@dist
```

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
- [x] "block_only" mode to serve as a blocklist even a route is not protected by PoW challenge
- [x] ~~RandomX PoW~~ unacceptably slow. Use blake3 (wasm) instead.
- [x] I18n
- [ ] Non-AI mascot

## Aggressive challenge policy

This is the first divergence from Anubis. Now, we require a user to repeat the challenge every few accesses. This is to ensure that we waste an attacker's computational resources to the extent that it becomes non-sustainable for the attacker to perform the attack.

This will surely slow down legitimate users, but we believe that this is a necessary evil to protect our infrastructure. After all, a slow down is better than a complete outage.

## Development

You need to first generate necessary go files before developing:
```bash
$ devenv tasks run go:codegen
```

If you modified any web asset, you need to run the following command to build the dist files:
```bash
$ devenv tasks run dist:build
```

Please run tests and lints before submitting a PR:
```bash
$ direnv test # or go test
$ devenv tasks run go:lint
```

## Build Pipeline

This repository uses a two-branch strategy:

- **master branch**: Contains source code only (no generated artifacts)
- **dist branch**: Contains both source code and all generated artifacts

### Release Process

To create a release:

1. Update the `Version` constant in `core/const.go`.
2. Go to "Actions" → "Build and Update Dist Branch" → "Run workflow".
3. Enter the version tag (e.g., "v1.0.0") and run the workflow.