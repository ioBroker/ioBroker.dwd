# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`iobroker.dwd` is an ioBroker adapter that reads the weather warnings of the **Deutscher Wetterdienst** from
`warnings.json`, picks the warnings of one configured region and writes them into a fixed number of
`warning<n>` channels. It optionally creates a set of states with buienradar rain radar image URLs, and it
ships a vis widget set (`widgets/`).

TypeScript (CommonJS output). Sources live in `src/`, the published and runnable code is the compiled
`build/` (`package.json` `main` is `build/main.js`). `build/` is gitignored — always run the build before
starting the adapter or the integration test.

The adapter runs in **schedule mode** (`common.mode: "schedule"`, every 5 minutes). It is not a daemon: it
reads the file once, writes the states and then calls `terminate()`. A kill switch terminates the process
after 4 minutes should anything hang.

## Commands

```bash
npm run build                             # tsc -p tsconfig.build.json  -> build/
npm run watch                             # same in watch mode
npm run check                             # type check only (tsconfig.json, noEmit)
npm run lint                              # eslint (@iobroker/eslint-config, flat config)
npx eslint -c eslint.config.mjs --fix .   # autofix + prettier formatting

npm run test:package                      # validates package.json / io-package.json / admin JSON (fast)
npm run test:integration                  # starts a real js-controller + adapter instance
npm run translate                         # translate-adapter -b admin/i18n/en.json
npm run release-patch                     # @alcalzone/release-script, moves README changelog into io-package news
```

There is deliberately **no `prepare` script** — `npm ci`/`npm install` does not build. Run `npm run build`
yourself after a fresh checkout. Because `build/` is neither committed nor built on install,
`common.nogit` is `true` in `io-package.json`: the adapter can only be installed from npm, not from GitHub.
The integration test requires that **no** js-controller is running on the machine, otherwise it aborts with
"JS-Controller is already running!".

## Architecture

### Layout

| Path | Content |
| --- | --- |
| `src/main.ts` | the whole adapter: one `Dwd extends utils.Adapter` class |
| `src/lib/tools.ts` | `getFile()` (HTTP + JSONP unwrapping) and `sort()` (warning order) |
| `src/lib/types.ts` | shape of `warnings.json` and of `instanceObjects` in io-package.json |
| `src/lib/adapter-config.d.ts` | augments `ioBroker.AdapterConfig` |
| `admin/jsonConfig.json` | the configuration dialog, `admin/i18n/<lang>.json` the translations |
| `widgets/dwd.html` | the vis widget set (plain JS, not part of the TS build) |

`src/lib/adapter-config.d.ts` is hand-maintained and must be kept in sync with `native` in
`io-package.json` **and** with `admin/jsonConfig.json` — nothing generates it.

### Reading the warnings: `src/lib/tools.ts`

`getFile(url, cb, retries = 3)` fetches the file, or reads it from disk when `url` is not an
`http(s)://` URL — that second path is what lets the integration test point the adapter at a fixture.

- The DWD serves the file as **JSONP** (`warnWetter.loadWarnings({...});`). `responseType: 'text'` keeps
  axios from parsing it, `parseBody()` strips the wrapper up to the last `}` and then `JSON.parse`s.
  A body that cannot be parsed is dumped next to the module as `problem.json`.
- `rejectUnauthorized: false` **and** `maxCachedSessions: 0` on the https agent — the latter disables TLS
  session resumption and works around `EPROTO` against the DWD server.
- Failed requests are retried up to 3 times, 3 s apart for `EPROTO`/`ECONNRESET`, 2 s otherwise.
- `sort()` orders the warnings of a region: highest `level` first, then earliest `start`, then latest
  `end`, then `type`. Missing entries sort to the end, so `warnings[c]` is `undefined` for the channels
  that have no warning and `placeWarning()` clears them.

### Objects

All object definitions live in `io-package.json` → `instanceObjects` and are **read at runtime** by
`addObjects()`, which resolves the template by mapping `warning<n>.<state>` back to `warning.<state>`.
`__dirname` is `build/`, so the file is read from `join(__dirname, '..', 'io-package.json')`.

`onReady()` reconciles the existing `warning<n>` channels with `config.warnings`:

- more channels than configured → the surplus channels and all their states are deleted
- fewer → the missing channels are created, plus `numberOfWarnings`
- for every channel from index 1 upwards, individually missing states are added (older versions of the
  adapter did not have `instruction` / `map`)

`addObjects()` only writes an initial state value for `string` states. It checks `obj.def`, which is never
set in `io-package.json` (the defaults live in `common.def`) — that looks wrong but is kept deliberately
so existing installations do not suddenly get values written into numeric states.

Channel names are rewritten to `DWD Warnung für <region>` by `checkNames()` on every run.

### States written per warning

`placeWarning()` writes `begin`, `end`, `severity` (`level - 1`, `0` when there is no warning), `level`,
`type`, `text`, `headline`, `description`, `instruction`, `object` (the raw JSON) and `map`. The map URL is
only built when `config.land` is set; the file name per warning type comes from the `MAPS` array in
`src/main.ts`, whose index is `DwdWarning.type`.

`numberOfWarnings` holds the number of warnings found for the region, `info.lastUpdate` the timestamp of
the last successful run.

### Rain radar

`doRainRadar()` creates 31 states below `rainradar.` with buienradar image URLs built from the latitude
and longitude of `system.config`. `Current.City_small` deliberately does not exist — it never did.
The states are only created, never updated afterwards (the URLs are static).

### Admin configuration

`admin/jsonConfig.json` (`common.adminUI.config = "json"`), translations are the flat
`admin/i18n/<lang>.json` files selected by `"i18n": true`. The region list is a hard-coded
`autocomplete` with `noTranslation: true` — the entries must match `regionName` in `warnings.json`
character for character, otherwise no warning is ever found.

`native.url` is **not** in the dialog on purpose: it was not editable in the old HTML admin either and
only exists so the tests can read a local file. `onReady()` falls back to the DWD URL when it is empty.

The `warnings` select stores its value as a **string** (`"1"` … `"10"`) while `native` defaults to the
number `1`; `onReady()` normalises it with `parseInt`. Do not "fix" this in the dialog — it would rewrite
the stored value of every existing instance.

### Misc conventions

- Always use `this.setTimeout` / `this.clearTimeout` (adapter-core, auto-cleared on unload), never the
  globals — this is why js-controller >= 6.0.11 is required.
- `main.ts` exports a factory when required (compact mode) and self-starts when run directly.
- `this.config` is typed through `src/lib/adapter-config.d.ts`; there is no `any` in `src/`.

## Release flow

Changelog lives in `README.md` under the `### **WORK IN PROGRESS**` placeholder comment; `release-script`
(config in `.releaseconfig.json`, plugins `iobroker` + `license`) moves it into `io-package.json`
`common.news`. CI (`.github/workflows/test-and-release.yml`) type-checks, lints and runs `test:package`,
then the adapter tests on Node 22/24/26 × Linux/Windows/macOS with `build: true`, and publishes to npm on
tagged commits.
