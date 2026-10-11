import type { DwdWarning, WarncellWarningProperties } from './types';

/**
 * A municipality warncell id of the DWD: 9 digits, starting with 8 (or 7 for the districts of
 * Berlin and Hamburg). The ids of the districts (`1…`) are not accepted on purpose - the geoserver
 * keeps their warnings in another layer under other ids, and the district level is what the region
 * setting already covers.
 */
export const WARNCELL_ID_PATTERN = /^[78]\d{8}$/;

const GEOSERVER = 'https://maps.dwd.de/geoserver/dwd/ows';

/** The attributes requested from `dwd:Warnungen_Gemeinden` - leaving out the geometry keeps the answer small */
const WARNING_PROPERTIES = [
    'AREADESC',
    'NAME',
    'WARNCELLID',
    'STATUS',
    'MSGTYPE',
    'EVENT',
    'SEVERITY',
    'EC_GROUP',
    'ONSET',
    'EXPIRES',
    'HEADLINE',
    'DESCRIPTION',
    'INSTRUCTION',
    'ALTITUDE',
    'CEILING',
];

function wfsUrl(typeName: string, warncellId: string, propertyNames: string[]): string {
    const params = new URLSearchParams({
        service: 'WFS',
        version: '2.0.0',
        request: 'GetFeature',
        typeName,
        outputFormat: 'application/json',
        propertyName: propertyNames.join(','),
        // `warncellId` is checked against WARNCELL_ID_PATTERN before, it cannot inject anything
        CQL_FILTER: `WARNCELLID=${warncellId}`,
    });
    return `${GEOSERVER}?${params.toString()}`;
}

/** URL of the warnings that are active for one municipality warncell */
export function warncellWarningsUrl(warncellId: string): string {
    return wfsUrl('dwd:Warnungen_Gemeinden', warncellId, WARNING_PROPERTIES);
}

/** URL of the area of one municipality warncell - it delivers the name even when there is no warning */
export function warncellAreaUrl(warncellId: string): string {
    return wfsUrl('dwd:Warngebiete_Gemeinden', warncellId, ['WARNCELLID', 'NAME', 'KURZNAME']);
}

/** CAP severity -> `DwdWarning.level` as `warnings.json` has it */
const LEVELS: Record<string, number> = {
    minor: 2,
    moderate: 3,
    severe: 4,
    extreme: 5,
};

/**
 * `EVENT` -> `DwdWarning.type`. The event names are the same as in `warnings.json`, so this is the
 * reliable way; the order matters (`STARKREGEN` must not end up as wind, `GLATTEIS` not as frost).
 */
const EVENT_TYPES: [RegExp, number][] = [
    [/GEWITTER|HAGEL/, 0],
    [/TAUWETTER/, 7],
    [/GLÄTTE|GLATTEIS/, 6],
    [/REGEN/, 2],
    [/SCHNEE/, 3],
    [/BÖEN|WIND|STURM|ORKAN|LEITERSEIL/, 1],
    [/NEBEL/, 4],
    [/FROST/, 5],
    [/HITZE/, 8],
    [/UV/, 9],
];

/** `EC_GROUP` -> `DwdWarning.type`, only used when the event name is not known */
const GROUP_TYPES: Record<string, number> = {
    THUNDERSTORM: 0,
    HAIL: 0,
    TORNADO: 1,
    WIND: 1,
    POWERLINEVIBRATION: 1,
    RAIN: 2,
    SNOWFALL: 3,
    SNOWDRIFT: 3,
    FOG: 4,
    FROST: 5,
    GLAZE: 6,
    THAW: 7,
    HEAT: 8,
    UV: 9,
};

function warningType(properties: WarncellWarningProperties): number | null {
    const event = (properties.EVENT || '').toUpperCase();
    for (const [pattern, type] of EVENT_TYPES) {
        if (pattern.test(event)) {
            return type;
        }
    }
    for (const group of (properties.EC_GROUP || '').toUpperCase().split(';')) {
        if (GROUP_TYPES[group.trim()] !== undefined) {
            return GROUP_TYPES[group.trim()];
        }
    }
    return null;
}

/** Feet -> metres. 0 and the 3000 m the DWD sends as "no ceiling" mean "no limit", like `null` in `warnings.json` */
function altitude(feet: number | null | undefined): number | null {
    if (!feet) {
        return null;
    }
    const metres = Math.round(feet * 0.3048);
    return metres >= 3000 ? null : metres;
}

/**
 * Whether a geoserver feature is a warning the adapter shows. Exercises, tests and cancellations are
 * dropped, and so is the "Vorabinformation", which the region path does not show either (it only reads
 * `warnings`, not `vorabInformation`).
 */
export function isShownWarning(properties: WarncellWarningProperties): boolean {
    return (
        (properties.STATUS || 'Actual') === 'Actual' &&
        properties.MSGTYPE !== 'Cancel' &&
        !(properties.EVENT || '').toUpperCase().startsWith('VORABINFORMATION')
    );
}

/** Convert a geoserver feature into the shape `warnings.json` has, so `placeWarning()` and `sort()` work unchanged */
export function toDwdWarning(properties: WarncellWarningProperties): DwdWarning {
    const start = properties.ONSET ? Date.parse(properties.ONSET) : NaN;
    const end = properties.EXPIRES ? Date.parse(properties.EXPIRES) : NaN;

    return {
        start: Number.isNaN(start) ? 0 : start,
        end: Number.isNaN(end) ? null : end,
        regionName: properties.NAME || properties.AREADESC || '',
        level: LEVELS[(properties.SEVERITY || '').toLowerCase()] ?? 0,
        // placeWarning() writes `null` for a missing type and no map
        type: warningType(properties) as number,
        altitudeStart: altitude(properties.ALTITUDE),
        altitudeEnd: altitude(properties.CEILING),
        event: properties.EVENT || '',
        headline: properties.HEADLINE || '',
        description: properties.DESCRIPTION || '',
        instruction: properties.INSTRUCTION || '',
        stateShort: '',
        state: '',
    };
}
