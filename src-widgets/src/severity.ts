/**
 * The background colour per `warning.severity`, taken over unchanged from the vis-1 widget set
 * (`widgets/dwd.html`). The numbers are the `states` of `warning.severity` in io-package.json:
 *
 * | value | meaning                                  |
 * |-------|------------------------------------------|
 * | 0     | None - no colour                         |
 * | 1     | Wetterwarnung                            |
 * | 2     | Warnung vor markantem Wetter             |
 * | 3     | Unwetterwarnung                          |
 * | 4     | Warnung vor extremem Unwetter            |
 * | 9     | Hitzewarnung                             |
 * | 11    | Keine Warnung                            |
 * | 19    | UV-Warnung                               |
 * | 49    | starke Hitze                             |
 * | 50    | extreme Hitze                            |
 *
 * Every other value has no colour, exactly as the gaps in the vis-1 array.
 */
const SEVERITY_COLORS: Record<number, string> = {
    1: '#ffeb3b',
    2: '#fb8c00',
    3: '#e53935',
    4: '#880e4f',
    9: '#c99afe',
    11: '#c9f',
    19: '#fe68fe',
    49: '#e966fe',
    50: '#f933fe',
};

/** Background colour for a severity value, `''` when the value has none. */
export function severityColor(value: ioBroker.StateValue | undefined): string {
    const severity = parseInt(String(value ?? ''), 10);
    return Number.isNaN(severity) ? '' : SEVERITY_COLORS[severity] || '';
}

/**
 * Readable text colour for one of the severity backgrounds.
 *
 * The severity colours carry the meaning of the warning and therefore do **not** follow the vis-2
 * theme - `#880e4f` has to stay `#880e4f` in the light theme as well. That makes the text colour of
 * the view unusable on top of them (white on yellow, black on dark red), so it is derived from the
 * background instead. Without a background colour the widget inherits the colour of the view, which
 * is what the vis-1 widget did in every case.
 */
export function textColorOn(background: string): string | undefined {
    if (!background) {
        return undefined;
    }

    let hex = background.substring(1);
    if (hex.length === 3) {
        hex = hex
            .split('')
            .map(c => c + c)
            .join('');
    }
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // ITU-R BT.601 luma - good enough to decide between black and white
    return (r * 299 + g * 587 + b * 114) / 1000 > 140 ? '#000000' : '#ffffff';
}

/**
 * The `formatDate` of the vis-1 widget set (`vis.binds.basic.formatDate`), reduced to the tokens a
 * DWD timestamp needs. The default format of the old widget was `DD.MM hh:mm`.
 *
 * @param value milliseconds since epoch, as the adapter writes `warning.begin` / `warning.end`
 * @param format format string with the tokens `YYYY`, `YY`, `MM`, `DD`, `hh`, `mm`, `ss`
 */
export function formatDate(value: ioBroker.StateValue | undefined, format: string): string {
    if (value === null || value === undefined || value === '' || value === 0) {
        return '';
    }

    const millis = typeof value === 'number' ? value : Number(value);
    const date = new Date(Number.isNaN(millis) ? String(value) : millis);
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    const pad = (n: number): string => (n < 10 ? `0${n}` : String(n));
    const tokens: Record<string, string> = {
        YYYY: String(date.getFullYear()),
        YY: String(date.getFullYear()).substring(2),
        MM: pad(date.getMonth() + 1),
        DD: pad(date.getDate()),
        hh: pad(date.getHours()),
        mm: pad(date.getMinutes()),
        ss: pad(date.getSeconds()),
    };

    return (format || 'DD.MM hh:mm').replace(/YYYY|YY|MM|DD|hh|mm|ss/g, token => tokens[token]);
}
