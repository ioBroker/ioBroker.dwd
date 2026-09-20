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
