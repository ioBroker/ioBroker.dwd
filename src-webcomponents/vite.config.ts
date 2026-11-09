import react from '@vitejs/plugin-react';
import { checkManifest, getReactImportPath, REACT_SPECIFIERS, type WebComponentText } from '@iobroker/web-components';
import { readFileSync } from 'node:fs';
import type { Plugin } from 'vite';

// with the extension: Vite may load its config natively, without a bundler that would add it
import { buildManifest, MANIFEST_FILE, MODULE_FILE, MODULE_PATH } from './src/manifest.ts';

/**
 * The web component `<iob-dwd-warnings>`: one ES module, `admin/webcomponents/dwd-warnings.js`, and its manifest
 * `dwd-warnings.json` next to it (`common.webComponents`). Every host - vis-2, devices, Aura, admin - reads them
 * from `/adapter/dwd/webcomponents/`. No module federation: the host shares nothing but the socket.
 *
 * React is not bundled: the four React imports point at `lib/esm/react-19.js`, which web and admin serve
 * beside `adapter/`. The path is relative to the module, so a path prefix of a reverse proxy stays.
 */

const LANGUAGES: ioBroker.Languages[] = ['en', 'de', 'ru', 'pt', 'nl', 'fr', 'it', 'es', 'pl', 'uk', 'zh-cn'];

/** The devices widget whose name and description the component takes over */
const DEVICES_WIDGET = 'DwdWarningsComponent';

function readJson<T>(path: string): T {
    return JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8')) as T;
}

/**
 * A word of a dictionary of a native widget, in every language
 *
 * @param folder the folder with `<lang>.json`
 */
function dictionary(folder: string): (key: string) => WebComponentText {
    const words = Object.fromEntries(
        LANGUAGES.map(lang => [lang, readJson<Record<string, string>>(`${folder}/${lang}.json`)]),
    );
    return (key: string): WebComponentText => {
        const text: Partial<Record<ioBroker.Languages, string>> = {};
        for (const lang of LANGUAGES) {
            if (!words[lang][key]) {
                throw new Error(`${folder}/${lang}.json has no "${key}"`);
            }
            text[lang] = words[lang][key];
        }
        return text as WebComponentText;
    };
}

/**
 * A text of `io-package.json`, which must be there in every language
 *
 * @param text the text
 * @param what where it is, for the error
 */
function translated(text: ioBroker.StringOrTranslated | undefined, what: string): WebComponentText {
    for (const lang of LANGUAGES) {
        if (!text || typeof text !== 'object' || !text[lang]) {
            throw new Error(`io-package.json: ${what} has no text in "${lang}"`);
        }
    }
    return text as WebComponentText;
}

/** Writes `dwd-warnings.json` next to the module, checked like a host checks it */
function manifestFile(): Plugin {
    return {
        name: 'dwd-web-component-manifest',
        generateBundle() {
            let manifest;
            try {
                const ioPackage = readJson<ioBroker.AdapterObject>('../io-package.json');
                const widget = ioPackage.common.deviceWidgets?.components.find(c => c.name === DEVICES_WIDGET);
                if (!widget) {
                    throw new Error(`io-package.json has no devices widget "${DEVICES_WIDGET}"`);
                }
                manifest = buildManifest({
                    name: translated(widget.label, `the label of ${DEVICES_WIDGET}`),
                    description: translated(widget.description, `the description of ${DEVICES_WIDGET}`),
                    devices: dictionary('../src-devices/src/i18n'),
                    vis: dictionary('../src-widgets/src/i18n'),
                });
            } catch (e) {
                this.error(`${MANIFEST_FILE}: ${(e as Error).message}`);
            }
            const problem = checkManifest(manifest);
            if (problem) {
                this.error(`${MANIFEST_FILE}: ${problem}`);
            }
            this.emitFile({
                type: 'asset',
                fileName: MANIFEST_FILE,
                source: `${JSON.stringify(manifest, null, 4)}\n`,
            });
        },
    };
}

const reactImport = getReactImportPath(MODULE_PATH);

export default {
    plugins: [react(), manifestFile()],
    define: {
        'process.env.NODE_ENV': JSON.stringify('production'),
    },
    build: {
        target: 'es2022',
        outDir: './build',
        emptyOutDir: true,
        lib: {
            entry: './src/index.tsx',
            formats: ['es'],
            fileName: (): string => MODULE_FILE,
        },
        rollupOptions: {
            external: [...REACT_SPECIFIERS],
            output: {
                paths: Object.fromEntries(REACT_SPECIFIERS.map(specifier => [specifier, reactImport])),
                // one file: a host imports exactly one URL
                codeSplitting: false,
                // library mode keeps whitespace for the bundler of a consumer; this module is loaded as it is
                minify: true,
            },
        },
    },
};
