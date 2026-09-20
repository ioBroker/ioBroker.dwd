# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`iobroker.dwd` is an ioBroker adapter that reads the weather warnings of the **Deutscher Wetterdienst** from
`warnings.json`, picks the warnings of one configured region and writes them into a fixed number of
`warning<n>` channels. It optionally creates a set of states with buienradar rain radar image URLs, and it
ships a vis widget set (`widgets/`).

TypeScript (CommonJS output). The adapter sources live in `src/`, the published and runnable code is the compiled
`build/` (`package.json` `main` is `build/main.js`). `build/` is gitignored — always run the build before
starting the adapter or the integration test.

The adapter runs in **schedule mode** (`common.mode: "schedule"`, every 5 minutes). It is not a daemon: it
reads the file once, writes the states and then calls `terminate()`. A kill switch terminates the process
after 4 minutes should anything hang.

## Commands

```bash
npm run build                             # adapter + both front-ends
npm run build:ts                          # tsc -p tsconfig.build.json  -> build/
npm run build:widgets                     # vis-2 widget set            -> widgets/dwd/
npm run build:devices                     # ioBroker.devices tile       -> admin/dm-widgets/
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
| `src-widgets/` | the vis-2 widget set (React), built to `widgets/dwd/` |
| `src-devices/` | the ioBroker.devices dashboard tile (React), built to `admin/dm-widgets/` |
| `widgets/dwd.html` | the vis-1 widget set (plain JS, hand-maintained, still shipped) |
| `tasks.mts` | builds the two front-ends, run straight from source by node's type stripping |

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
`admin/i18n/<lang>.json` files selected by `"i18n": true`.

Below the settings the dialog lists the **currently active warnings** (`_cur*` items). They are
`"type": "state"` controls with `oid: "warning<n>.headline"` and friends - `oid` is relative to
`dwd.<instance>`, so no instance has to be resolved. Two things make that work:

- The values come from the **states**, not from the adapter process. The adapter runs in schedule
  mode and is alive for a few seconds every five minutes, so `sendTo`-based controls
  (`textSendTo`, `selectSendTo`, ...) would time out almost always. Never move this to `sendTo`.
- `dependsOnStates` subscribes `.warning<n>.headline` and `.warning<n>.instruction`, and `hidden`
  evaluates `!_states.head?.val`. An empty channel (the adapter clears the ones it does not need)
  and a channel that does not exist at all are therefore both hidden, without the expression having
  to know `data.warnings`.

All ten blocks are always in the file; which ones are visible is decided at runtime. The items are
generated, so if the shape has to change, change all ten. Requires admin >= 7.1.0 for `state` and a
newer one for `dependsOnStates` - `common.globalDependencies` already asks for `admin >= 7.6.17`. The region list is a hard-coded
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

## The two front-ends

Both are React + TypeScript, built with vite and `@module-federation/vite`, and follow
`C:\pWork\ioBroker.sonos` - an adapter that hosts the same two bundles.

| | `src-widgets/` | `src-devices/` |
| --- | --- | --- |
| loaded by | vis-2 | the ioBroker.devices dashboard |
| federation name | `vis2DwdWidgets` | `DevicesWidgetDwdSet` |
| remote entry | `customWidgets.js` | `customDevices.js` |
| output | `widgets/dwd/` (gitignored, built on publish) | `admin/dm-widgets/` (**committed**) |
| declared in io-package.json | `common.visWidgets` | `common.deviceWidgets` |
| i18n prefix | `dwd_` | `dwddm_` |

The exposed component names and the URL are repeated in `io-package.json` - adding a widget means
touching `exposes` in the vite config **and** that block.

`widgets/dwd/img/` is **not** generated: it holds the preview images of the vis-1 set, and the vis-2
widget references `Prev_DwdAdapter.png` from there as its `visPrev`. `tasks.mts` therefore deletes
only `widgets/dwd/assets`, never the whole folder.

`admin/dm-widgets/` is committed although it is build output - the module federation build pulls in
the whole shared GUI stack, so rebuilding it on every CI matrix cell is not worth it. Re-run
`npm run build:devices` and commit the result whenever something under `src-devices/` changed.

### vis-1 -> vis-2 migration

vis-2 loads the vis-1 set as well, and **a React widget replaces the EJS widget of the same id**.
`DwdWarnings.getWidgetInfo()` therefore returns `id: 'tplDwdAdapter'` and `visSet: 'dwd'` - change
either and existing views silently fall back to the old EJS rendering.

The old set had two templates; the vis-2 set has **one** widget with a `layout` setting
(`normal` / `small`). `tplDwdAdapterSmall` keeps being rendered by the vis-1 template, on purpose -
registering a second React widget for it would put two entries in the palette.

Views migrated from vis-1 carry the old attribute names (`oid`, `oid-headline`, `oid-severity`,
`oid-begin`, `oid-end`, `oid-hint`). `usesOids()` detects them and lets them win over the
instance+index derivation, so a migrated widget keeps showing what it showed before. Those names
must not be renamed - widget data is stored per attribute name.

The vis-1 default for the instruction field was `dwd.0.warning.hint`, a state that does not exist
(the adapter writes `warning.instruction`). That default is left as it is in the vis-1 template and
documented in `docs/`; the vis-2 widget uses `instruction` when it derives the ids itself.

### The severity colours

`src-widgets/src/severity.ts` and `src-devices/src/severity.ts` are **the same file**, kept in sync
by hand (the two bundles have no shared package). It holds the colour table taken over from the
vis-1 widget and the `formatDate` replacement for `vis.binds.basic.formatDate`.

The colours are the meaning of the warning, so they do not follow the theme. Only the text colour on
top is derived from the background (`textColorOn`), because the view's text colour is unusable on
both `#ffeb3b` and `#880e4f`.

## Documentation

`docs/en/README.md` and `docs/de/README.md` describe both widgets and the instance settings. The
illustrations in `docs/img/` are hand-written SVG, not screenshots.

They deliberately carry **no** `prefers-color-scheme` media query: inside an `<img>` that query
follows the operating system, not the theme of the page the image sits in, so a dark card would end
up on a light GitHub page. The cards are light in both themes, like a screenshot would be.

`docs/img/severity-colors.svg` is generated - `npm run docs:images` re-renders it from the colour
table in `src-widgets/src/severity.ts`, including the black/white text decision, so the
documentation cannot drift away from the code. The other three are edited by hand.

## Release flow

Changelog lives in `README.md` under the `### **WORK IN PROGRESS**` placeholder comment; `release-script`
(config in `.releaseconfig.json`, plugins `iobroker` + `license`) moves it into `io-package.json`
`common.news`. CI (`.github/workflows/test-and-release.yml`) type-checks, lints and runs `test:package`,
then the adapter tests on Node 22/24/26 × Linux/Windows/macOS with `build: true`, and publishes to npm on
tagged commits.
