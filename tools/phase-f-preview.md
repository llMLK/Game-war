# Phase F preview build

The preview builder publishes only the runtime files referenced by the game entry point, plus generated preview metadata. It never copies player saves, Git configuration, tests, documentation, or screenshots. A separate `suyuf-preview:phase-f:` storage namespace isolates the game on the preview Pages path even when the official game shares the same browser origin.

Run the isolation and manifest test:

```sh
node tests/phase-f-preview.cjs
```

After committing the tested Phase F runtime, create a fresh publication directory:

```sh
node tools/phase-f-preview.cjs --out artifacts/phase-f/preview-public --source-commit HEAD
```

The destination must not exist. The builder compares runtime files with the stated source commit using Git's configured clean filters, so a clean CRLF checkout is accepted. Publication uses the exact committed Git blob bytes and records their hashes. Genuine source differences are refused. `--allow-dirty` is only for local development tests; a resulting `developmentSnapshot: true` build must not be published.

Publish the output to the separate `llMLK/Game-war-preview` repository. Its `index.html` explains the preview and displays the complete source commit; `game.html` runs the isolated game, and `build-info.json` records source and generated-file SHA256 hashes. The preview PWA also has its own identity and starts at `game.html`. Never publish this output to the official repository or alter its Pages settings.

The browser test uses Playwright and Edge. It first creates synthetic official saves, then tests preview save/load/delete on the **same origin**, and verifies the official saves remain byte-for-byte unchanged. Set `PLAYWRIGHT_MODULE` or `PLAYWRIGHT_CHANNEL` when the local browser dependencies use different paths.
