/*!
 * Build tasks of ioBroker.dwd
 *
 * Three front-ends live next to the adapter, all built with vite - the first two with module federation:
 *
 *   src-widgets/        -> widgets/dwd/           the vis-2 widget set (loaded by vis-2)
 *   src-devices/        -> admin/dm-widgets/      the widgets ioBroker.devices shows in its dashboard
 *   src-webcomponents/  -> admin/webcomponents/   the web component <iob-dwd-warnings> for Aura, admin and every
 *                                                 other host of `@iobroker/web-components`
 *
 * `npm run build` builds the adapter and all front-ends - that is what CI and `npm publish` run.
 *
 * This file is run straight from source - `node tasks.mts` - by the type stripping node brings
 * along, so it must stay free of syntax that a compiler would have to rewrite (`enum`,
 * `namespace`, parameter properties). `npm run check` enforces that with `erasableSyntaxOnly`.
 */
import { existsSync } from 'node:fs';
import { deleteFoldersRecursive, npmInstall, buildReact, copyFiles } from '@iobroker/build-tools';

/** Directory of this file, and with it the root of the adapter */
const ROOT: string = import.meta.dirname;
/** Directory of the vis-2 widget sources */
const SRC_WIDGETS = `${ROOT}/src-widgets`;
/** Directory of the ioBroker.devices widget sources */
const SRC_DEVICES = `${ROOT}/src-devices`;
/** Directory of the web component sources */
const SRC_WC = `${ROOT}/src-webcomponents`;
/** Served as `/adapter/dwd/webcomponents/`; must match `common.webComponents` in io-package.json */
const WC_DEST = 'admin/webcomponents/';

/**
 * Copies the built vis-2 widgets into `widgets/dwd/`.
 *
 * The preview images of the vis-1 widget set live in the same place (`widgets/dwd/img/`) and must
 * survive - the vis-2 widget references `Prev_DwdAdapter.png` from there - so only the bundle of
 * the previous build is removed.
 */
function copyWidgets(): void {
    deleteFoldersRecursive(`${ROOT}/widgets/dwd/assets`);
    // mf-manifest.json is kept: vis-2 reads it to decide whether the set was built against a
    // compatible React, and asks for it before mf-stats.json.
    copyFiles(['src-widgets/build/**/*', '!src-widgets/build/index.html'], 'widgets/dwd/');
}

/**
 * Copies the built ioBroker.devices widgets into `admin/dm-widgets/`, from where the devices
 * adapter loads them - see `common.deviceWidgets` in io-package.json.
 */
function copyDevices(): void {
    copyFiles(['src-devices/build/**/*', '!src-devices/build/index.html'], 'admin/dm-widgets/');
    copyFiles(['src-devices/img/**/*'], 'admin/dm-widgets');
    copyFiles(['src-devices/src/i18n/*.json'], 'admin/dm-widgets/i18n');
}

async function installIfNeeded(dir: string): Promise<void> {
    if (!existsSync(`${dir}/node_modules`)) {
        await npmInstall(dir);
    }
}

async function buildWidgets(): Promise<void> {
    deleteFoldersRecursive(`${SRC_WIDGETS}/build`);
    await installIfNeeded(SRC_WIDGETS);
    await buildReact(SRC_WIDGETS, { rootDir: ROOT, vite: true });
    copyWidgets();
}

async function buildDevices(): Promise<void> {
    deleteFoldersRecursive(`${ROOT}/admin/dm-widgets`);
    deleteFoldersRecursive(`${SRC_DEVICES}/build`);
    await installIfNeeded(SRC_DEVICES);
    await buildReact(SRC_DEVICES, { rootDir: SRC_DEVICES, vite: true });
    copyDevices();
}

/**
 * Builds the web component: one ES module and its manifest (`dwd-warnings.js`, `dwd-warnings.json`). The build
 * fails if the manifest does not pass `checkManifest`. The destination is emptied first, so no module of an earlier
 * build is published with the next release.
 */
async function buildWebComponents(): Promise<void> {
    deleteFoldersRecursive(`${ROOT}/${WC_DEST}`);
    deleteFoldersRecursive(`${SRC_WC}/build`);
    await installIfNeeded(SRC_WC);
    await buildReact(SRC_WC, { rootDir: SRC_WC, vite: true });
    copyFiles(['src-webcomponents/build/*.js', 'src-webcomponents/build/*.json'], WC_DEST);
}

async function main(): Promise<void> {
    if (process.argv.includes('--install')) {
        // `npm run lint` needs the dependencies of both front-ends - without them eslint cannot
        // resolve the React and vis-2 types, and CI lints before anything is built
        await installIfNeeded(SRC_WIDGETS);
        await installIfNeeded(SRC_DEVICES);
        await installIfNeeded(SRC_WC);
        return;
    }
    if (process.argv.includes('--copy-files')) {
        copyWidgets();
        return;
    }
    if (process.argv.includes('--devices')) {
        await buildDevices();
        return;
    }
    if (process.argv.includes('--wc')) {
        await buildWebComponents();
        return;
    }
    if (process.argv.includes('--all')) {
        await buildWidgets();
        await buildDevices();
        await buildWebComponents();
        return;
    }
    await buildWidgets();
}

main().catch((e: unknown) => {
    console.error(`Cannot build: ${e as string}`);
    process.exit(2);
});
