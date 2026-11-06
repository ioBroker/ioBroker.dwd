/**
 * The manifest of `<iob-dwd-warnings>`. Read by the build only (`vite.config.ts`), which writes it as
 * `dwd-warnings.json` next to the module - a host reads that file for its palette and its settings without loading
 * the module.
 *
 * Most words come from the native widgets: the name and the description from the devices widget in
 * `io-package.json`, the labels from `src-devices/src/i18n/` and `src-widgets/src/i18n/`. The build reads them; only
 * the words for the source of the warnings are new and live here.
 */
import type { WebComponentManifest, WebComponentText } from '@iobroker/web-components';

// with the extension: `vite.config.ts` imports this file, and Vite may load its config natively
import { DEFAULT_TIME_FORMAT, MODULE_FILE, TAG } from './constants.ts';

export { MANIFEST_FILE, MODULE_FILE, MODULE_PATH, TAG } from './constants.ts';

/** The words of the native widgets, read by the build */
export interface ManifestTexts {
    /**
     * `label` of the devices widget in `io-package.json`. The same name, per language, makes vis-2 and devices
     * offer the native widget instead of this component
     */
    name: WebComponentText;
    /** `description` of the devices widget in `io-package.json` */
    description: WebComponentText;
    /** A word of the devices tile (`src-devices/src/i18n/`) in every language */
    devices: (key: string) => WebComponentText;
    /** A word of the vis-2 widget (`src-widgets/src/i18n/`, without the prefix `dwd_`) in every language */
    vis: (key: string) => WebComponentText;
}

const SOURCE: WebComponentText = {
    en: 'Warnings for',
    de: 'Warnungen für',
    ru: 'Предупреждения для',
    pt: 'Avisos para',
    nl: 'Waarschuwingen voor',
    fr: 'Alertes pour',
    it: 'Avvisi per',
    es: 'Avisos para',
    pl: 'Ostrzeżenia dla',
    uk: 'Попередження для',
    'zh-cn': '警告范围',
};

const SOURCE_REGION: WebComponentText = {
    en: 'Region',
    de: 'Region',
    ru: 'Область',
    pt: 'Região',
    nl: 'Regio',
    fr: 'Région',
    it: 'Regione',
    es: 'Región',
    pl: 'Region',
    uk: 'Регіон',
    'zh-cn': '地区',
};

const SOURCE_WARNCELL: WebComponentText = {
    en: 'Municipality (warncell)',
    de: 'Gemeinde (Warnzelle)',
    ru: 'Муниципалитет (ячейка предупреждений)',
    pt: 'Município (célula de aviso)',
    nl: 'Gemeente (waarschuwingscel)',
    fr: "Commune (cellule d'alerte)",
    it: 'Comune (cella di allerta)',
    es: 'Municipio (celda de aviso)',
    pl: 'Gmina (komórka ostrzeżeń)',
    uk: 'Громада (комірка попереджень)',
    'zh-cn': '市镇（预警单元）',
};

const SOURCE_HELP: WebComponentText = {
    en: 'The region of the instance settings, or the municipality of their warncell ID',
    de: 'Die Region der Instanzeinstellungen oder die Gemeinde ihrer Warnzellen-ID',
    ru: 'Область из настроек экземпляра или муниципалитет их ID ячейки предупреждений',
    pt: 'A região das configurações da instância ou o município do seu ID da célula de aviso',
    nl: 'De regio uit de instantie-instellingen of de gemeente van hun waarschuwingscel-ID',
    fr: "La région des paramètres de l'instance ou la commune de leur ID de cellule d'alerte",
    it: "La regione delle impostazioni dell'istanza o il comune del loro ID cella di allerta",
    es: 'La región de la configuración de la instancia o el municipio de su ID de celda de aviso',
    pl: 'Region z ustawień instancji lub gmina ich ID komórki ostrzeżeń',
    uk: 'Регіон із налаштувань екземпляра або громада їхнього ID комірки попереджень',
    'zh-cn': '实例设置中的地区，或其预警单元 ID 对应的市镇',
};

/**
 * The manifest with the words of the native widgets
 *
 * @param texts what the build read from `io-package.json` and the dictionaries
 */
export function buildManifest(texts: ManifestTexts): WebComponentManifest {
    const { devices, vis } = texts;
    return {
        $schema: 'https://raw.githubusercontent.com/ioBroker/web-components/main/schemas/manifest.json',
        manifestVersion: 1,
        tag: TAG,
        name: texts.name,
        description: texts.description,
        // relative to this file: /adapter/dwd/dm-widgets/warnings.png, the icon of the devices widget
        icon: '../dm-widgets/warnings.png',
        module: MODULE_FILE,
        // the default size of the vis-2 widget
        size: { width: 585, height: 85 },
        settings: {
            type: 'panel',
            items: {
                instance: {
                    type: 'instance',
                    adapter: 'dwd',
                    default: 'dwd.0',
                    label: devices('dwddm_instance'),
                },
                source: {
                    type: 'select',
                    default: 'region',
                    label: SOURCE,
                    help: SOURCE_HELP,
                    options: [
                        { value: 'region', label: SOURCE_REGION },
                        { value: 'warncell', label: SOURCE_WARNCELL },
                    ],
                },
                warning: {
                    type: 'number',
                    min: 0,
                    max: 9,
                    default: 0,
                    label: devices('dwddm_warning'),
                    help: devices('dwddm_warning_tooltip'),
                },
                layout: {
                    type: 'select',
                    default: 'normal',
                    label: vis('layout'),
                    options: [
                        { value: 'normal', label: vis('layout_normal') },
                        { value: 'small', label: vis('layout_small') },
                    ],
                },
                title: {
                    type: 'text',
                    label: devices('dwddm_name'),
                    hidden: 'data.layout === "small"',
                },
                showPeriod: {
                    type: 'checkbox',
                    default: true,
                    label: devices('dwddm_show_period'),
                    hidden: 'data.layout === "small"',
                },
                timeFormat: {
                    type: 'text',
                    default: DEFAULT_TIME_FORMAT,
                    label: devices('dwddm_time_format'),
                    help: devices('dwddm_time_format_tooltip'),
                    hidden: 'data.layout === "small" || data.showPeriod === false',
                },
                showInstruction: {
                    type: 'checkbox',
                    default: false,
                    label: devices('dwddm_show_instruction'),
                    hidden: 'data.layout === "small"',
                },
            },
        },
    };
}
