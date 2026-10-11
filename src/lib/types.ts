/**
 * One warning entry as it is delivered inside `warnings.json` of the DWD.
 *
 * ```json
 * {
 *     "start": 1497254400000,
 *     "end": 1497290400000,
 *     "regionName": "Kreis Harburg",
 *     "level": 2,
 *     "type": 1,
 *     "altitudeStart": null,
 *     "event": "WINDBÖEN",
 *     "headline": "Amtliche WARNUNG vor WINDBÖEN",
 *     "description": "Es treten Windböen mit Geschwindigkeiten ... ",
 *     "altitudeEnd": null,
 *     "stateShort": "NS",
 *     "instruction": "",
 *     "state": "Niedersachsen"
 * }
 * ```
 */
export interface DwdWarning {
    /** Milliseconds since epoch */
    start: number;
    /** Milliseconds since epoch - not every warning has an end */
    end: number | null;
    regionName: string;
    /**
     * - 1 = Vorabinformation Unwetter
     * - 2 = Wetterwarnungen
     * - 3 = Warnungen vor markantem Wetter
     * - 4 = Unwetterwarnungen
     * - 5 = Warnungen vor extremem Unwetter
     */
    level: number;
    /**
     * - 0 = Gewitter inklusive Begleiterscheinungen
     * - 1 = Wind/Sturm/Orkan
     * - 2 = Stark- und Dauerregen
     * - 3 = Schneefall/Schneeverwehungen
     * - 4 = Nebel
     * - 5 = Frost
     * - 6 = Glätte/Glatteis
     * - 7 = Tauwetter
     * - 8 = Hitzewarnungen
     * - 9 = UV-Warnungen
     * - 10 = Küstenwarnungen ??
     * - 11 = Binnenseewarnungen ??
     */
    type: number;
    altitudeStart: number | null;
    altitudeEnd: number | null;
    event: string;
    headline: string;
    description: string;
    instruction: string;
    stateShort: string;
    state: string;
}

/** The parsed content of the DWD `warnings.json` */
export interface DwdWarningsFile {
    time?: number;
    /** Keyed by the internal DWD region id */
    warnings?: Record<string, DwdWarning[]>;
    vorabInformation?: Record<string, DwdWarning[]>;
}

/** One entry of `instanceObjects` in io-package.json */
export type InstanceObject = ioBroker.SettableObject & {
    _id: string;
    /**
     * Never actually present in io-package.json - the defaults are stored in `common.def`.
     * Kept because `addObjects()` reads it, see the comment there.
     */
    def?: ioBroker.StateValue;
};

/** The parts of io-package.json this adapter reads at runtime */
export interface IoPackage {
    instanceObjects: InstanceObject[];
}

/**
 * The properties of one feature of the DWD geoserver layer `dwd:Warnungen_Gemeinden` - one warning
 * for one municipality warncell. Only the attributes the adapter requests are listed.
 *
 * ```json
 * {
 *     "AREADESC": "Affinghausen",
 *     "NAME": "Gemeinde Affinghausen",
 *     "WARNCELLID": 803251001,
 *     "STATUS": "Actual",
 *     "MSGTYPE": "Alert",
 *     "EVENT": "STARKES GEWITTER",
 *     "SEVERITY": "Moderate",
 *     "EC_GROUP": "THUNDERSTORM;WIND;RAIN",
 *     "ONSET": "2026-10-11T14:00:00Z",
 *     "EXPIRES": "2026-10-11T15:00:00Z",
 *     "HEADLINE": "Amtliche WARNUNG vor STARKEM GEWITTER",
 *     "ALTITUDE": 0,
 *     "CEILING": 9842.5197
 * }
 * ```
 */
export interface WarncellWarningProperties {
    AREADESC?: string;
    NAME?: string;
    WARNCELLID?: number;
    /** `Actual`, `Exercise`, `Test`, ... */
    STATUS?: string;
    /** `Alert`, `Update`, `Cancel` */
    MSGTYPE?: string;
    EVENT?: string;
    /** `Minor`, `Moderate`, `Severe`, `Extreme` */
    SEVERITY?: string;
    /** semicolon separated, e.g. `THUNDERSTORM;WIND;RAIN` */
    EC_GROUP?: string;
    /** ISO 8601 */
    ONSET?: string;
    /** ISO 8601, missing when the warning has no end */
    EXPIRES?: string | null;
    HEADLINE?: string;
    DESCRIPTION?: string;
    INSTRUCTION?: string | null;
    /** feet above sea level */
    ALTITUDE?: number | null;
    /** feet above sea level */
    CEILING?: number | null;
}

/** The properties of one feature of the DWD geoserver layer `dwd:Warngebiete_Gemeinden` */
export interface WarncellAreaProperties {
    WARNCELLID?: number;
    /** e.g. `Gemeinde Affinghausen` */
    NAME?: string;
    KURZNAME?: string;
}

/** A GeoJSON answer of the DWD geoserver (WFS `GetFeature` with `outputFormat=application/json`) */
export interface WfsFeatureCollection<P> {
    type: 'FeatureCollection';
    features?: { properties?: P | null }[];
}
