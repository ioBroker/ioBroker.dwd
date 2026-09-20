// Augments the globally declared ioBroker types with everything this adapter adds.
// The attributes of `AdapterConfig` must be kept in sync with `native` in io-package.json
// and with admin/jsonConfig.json.

declare global {
    namespace ioBroker {
        interface AdapterConfig {
            /**
             * URL of the DWD warnings file. Deliberately not part of admin/jsonConfig.json - it was
             * not editable in the old HTML admin either and only exists so that the integration
             * test can point the adapter at a local file.
             */
            url: string;
            /** Region name, exactly as the DWD writes it into `regionName` */
            region: string;
            /** Shortcut of the federal state for the warning map, `''` = no map */
            land: string;
            /**
             * Number of warning channels to create (1..10). The select in the admin stores this as
             * a string, existing instances may hold a number - `onReady()` normalises it.
             */
            warnings: number;
            /** Create the states that embed the buienradar rain radar into a visualization */
            rainRadar: boolean;
        }
    }
}

// this is required so the above is treated as a module
export {};
