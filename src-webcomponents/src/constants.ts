/** Tag of the custom element; a host checks that the module defines exactly this one */
export const TAG = 'iob-dwd-warnings';

/** The built module, next to its manifest */
export const MODULE_FILE = 'dwd-warnings.js';

/** The manifest the build writes next to the module; `common.webComponents` names this one */
export const MANIFEST_FILE = 'dwd-warnings.json';

/** Where `tasks.mts` puts the module in the admin folder; the React import is relative to it */
export const MODULE_PATH = `webcomponents/${MODULE_FILE}`;

/** The states of one `warning<n>` channel the element shows */
export const WARNING_STATES = ['text', 'headline', 'description', 'instruction', 'severity', 'begin', 'end'] as const;

export type WarningState = (typeof WARNING_STATES)[number];

/** The default of the vis-1 widget, kept by the vis-2 widget and the devices tile */
export const DEFAULT_TIME_FORMAT = 'DD.MM hh:mm';

/** The values of the settings of the manifest; a setting without a value is missing */
export type WarningsSettings = {
    /** Instance of the dwd adapter: `dwd.0` (JSON-Config), also `0` or `system.adapter.dwd.0` */
    instance?: string;
    /** `region` - `warning<n>`, `warncell` - `warncell.warning<n>` */
    source?: string;
    /** Which channel, 0 is the most severe warning */
    warning?: number;
    /** `normal` - headline, description, period, instruction; `small` - one line with the warning text */
    layout?: string;
    /** Shown above the warning */
    title?: string;
    showPeriod?: boolean;
    timeFormat?: string;
    showInstruction?: boolean;
};

/**
 * The number of the adapter instance a setting names
 *
 * @param instance `dwd.0`, `system.adapter.dwd.0` or `0`
 * @returns `0`, or null if the setting names no instance of dwd
 */
export function getInstance(instance: string | number | undefined): number | null {
    const text = instance === undefined || instance === null ? '' : String(instance).trim();
    const match = text.match(/^(?:(?:system\.adapter\.)?dwd\.)?(\d+)$/);
    return match ? parseInt(match[1], 10) : null;
}

/**
 * The channel of a warning: `dwd.<n>.warning<k>`, below `warncell.` for the municipality. The first channel has no
 * number - there is no `warning0`.
 *
 * @param settings the settings of the element
 * @returns e.g. `dwd.0.warning` or `dwd.0.warncell.warning2`, or null without an instance
 */
export function getChannel(settings: WarningsSettings): string | null {
    const instance = getInstance(settings.instance);
    if (instance === null) {
        return null;
    }
    const index = Math.min(9, Math.max(0, Math.floor(Number(settings.warning) || 0)));
    const folder = settings.source === 'warncell' ? 'warncell.' : '';
    return `dwd.${instance}.${folder}warning${index || ''}`;
}
