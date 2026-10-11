/*
 * ioBroker.dwd - weather warnings of the Deutscher Wetterdienst
 *
 * Copyright Deutscher Wetterdienst
 * Copyright (c) 2016-2026 bluefox <dogafox@gmail.com>, hobbyquaker
 *
 * MIT License, see LICENSE
 */
import * as utils from '@iobroker/adapter-core';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getFile, getFileAsync, sort } from './lib/tools';
import type {
    DwdWarning,
    DwdWarningsFile,
    InstanceObject,
    IoPackage,
    WarncellAreaProperties,
    WarncellWarningProperties,
    WfsFeatureCollection,
} from './lib/types';
import {
    isShownWarning,
    toDwdWarning,
    WARNCELL_ID_PATTERN,
    warncellAreaUrl,
    warncellWarningsUrl,
} from './lib/warncell';

/** The states that make up one `warning<n>` channel, in the order the old code created them */
const WARNING_STATES = [
    'begin',
    'end',
    'severity',
    'level',
    'type',
    'text',
    'headline',
    'description',
    'instruction',
    'object',
    'map',
] as const;

/** Map file name per warning type, indexed by `DwdWarning.type` */
const MAPS = ['gewitter', 'sturm', 'regen', 'schnee', 'nebel', 'frost', 'glatteis', 'tauwetter', 'hitze', 'uv'];

/** The adapter runs in schedule mode - if it is still alive after this time, something hangs */
const KILL_SWITCH_TIMEOUT = 240_000;

class Dwd extends utils.Adapter {
    /** Full ids of the existing `dwd.<i>.warning<n>` channels, sorted */
    private channels: string[] = [];
    /** Full ids of the `dwd.<i>.warncell.warning<n>` channels, in index order. Empty when no warncell is used. */
    private warncellChannels: string[] = [];
    /** Lazily read io-package.json, the source of the object definitions */
    private ioPackage: IoPackage | null = null;
    private isStopped = false;
    private killSwitchTimeout: ioBroker.Timeout | null = null;

    public constructor(options: Partial<utils.AdapterOptions> = {}) {
        super({
            ...options,
            name: 'dwd',
            useFormatDate: true,
        });

        this.on('ready', () => this.onReady());
        this.on('unload', callback => this.onUnload(callback));

        // The JS version armed this timer while the module was loading, i.e. right before the
        // instance was created.
        this.killSwitchTimeout =
            this.setTimeout(() => {
                this.killSwitchTimeout = null;
                if (!this.isStopped) {
                    this.log.info('force terminating after 4 minutes');
                    this.terminateAdapter();
                }
            }, KILL_SWITCH_TIMEOUT) ?? null;
    }

    private onUnload(callback: () => void): void {
        try {
            if (this.killSwitchTimeout) {
                this.clearTimeout(this.killSwitchTimeout);
                this.killSwitchTimeout = null;
            }
        } catch {
            // ignore
        }
        callback();
    }

    private terminateAdapter(): void {
        this.isStopped = true;
        if (this.killSwitchTimeout) {
            this.clearTimeout(this.killSwitchTimeout);
            this.killSwitchTimeout = null;
        }
        this.terminate ? this.terminate() : process.exit(0);
    }

    private getIoPackage(): IoPackage {
        // `__dirname` is `build/`, io-package.json lives one level above it
        this.ioPackage ??= JSON.parse(readFileSync(join(__dirname, '..', 'io-package.json'), 'utf8')) as IoPackage;
        return this.ioPackage;
    }

    private async onReady(): Promise<void> {
        // The select in the admin delivers a string, older instances may hold a number
        this.config.warnings = parseInt(this.config.warnings as unknown as string, 10) || 1;

        this.config.url ||= 'http://www.dwd.de/DWD/warnungen/warnapp/json/warnings.json';
        // Not set at all in instances created before the setting existed
        this.config.warncellId = String(this.config.warncellId ?? '').trim();

        if (this.config.rainRadar === true) {
            await this.doRainRadar();
        }

        let states: Record<string, ioBroker.StateObject>;
        try {
            states = await this.getForeignObjectsAsync(`${this.namespace}.*`, 'state');
        } catch (e) {
            this.log.error(`Could not read existing states: ${(e as Error).message}`);
            this.terminateAdapter();
            return;
        }

        for (const s in states) {
            if (!s.startsWith(`${this.namespace}.warning`)) {
                continue;
            }
            const parts = s.split('.');
            parts.pop();
            const chName = parts.join('.');
            if (!this.channels.includes(chName)) {
                this.channels.push(chName);
            }
        }

        this.log.debug(`Warnings configured: ${this.config.warnings}`);
        this.log.debug(`Existing Channels: ${JSON.stringify(this.channels)}`);

        const toDelete: string[] = [];
        const toAdd: string[] = [];

        if (this.channels.length > this.config.warnings) {
            // delete warnings
            for (let i = this.config.warnings; i < this.channels.length; i++) {
                this.log.debug(`Delete channel ${i}: ${this.channels[i]}`);
                for (const state of WARNING_STATES) {
                    toDelete.push(`${this.channels[i]}.${state}`);
                }
                toDelete.push(this.channels[i]);
            }
            await this.deleteObjects(toDelete);
            this.channels.splice(this.config.warnings, this.channels.length);
        }

        if (this.channels.length < this.config.warnings) {
            // add warnings
            for (let j = this.channels.length; j < this.config.warnings; j++) {
                this.log.debug(`Add channel ${j}: ${this.channels[j]}`);
                toAdd.push(`${this.namespace}.warning${j}`);
                for (const state of WARNING_STATES) {
                    toAdd.push(`${this.namespace}.warning${j}.${state}`);
                }
                this.channels.push(`${this.namespace}.warning${j}`);
            }
            toAdd.push(`${this.namespace}.numberOfWarnings`);
        }

        // the first channel `warning` comes from instanceObjects, so it deliberately starts at 1
        for (let j = 1; j < this.channels.length; j++) {
            for (const state of WARNING_STATES) {
                if (!states[`${this.namespace}.warning${j}.${state}`]) {
                    toAdd.push(`${this.namespace}.warning${j}.${state}`);
                }
            }
        }

        if (toAdd.length) {
            this.log.debug(`Add ${toAdd.length} missing states: ${JSON.stringify(toAdd)}`);
            await this.addObjects(toAdd);
        }

        this.log.debug(`Final Channels: ${JSON.stringify(this.channels)}`);
        await this.checkNames();
        await this.syncWarncellObjects();
        this.readWarnings();
    }

    private async deleteObjects(objs: string[]): Promise<void> {
        for (const id of objs) {
            try {
                await this.delForeignObjectAsync(id);
                await this.delForeignStateAsync(id);
            } catch {
                // ignore
            }
        }
    }

    private async addObjects(objs: string[]): Promise<void> {
        const ioPackage = this.getIoPackage();

        while (objs.length) {
            const id = objs.pop() as string;
            const _id = id.replace(/warning\d+/, 'warning');
            const obj: InstanceObject | undefined = ioPackage.instanceObjects.find(
                o => `${this.namespace}.${o._id}` === _id,
            );

            if (!obj) {
                this.log.warn(`Object ${id} not found`);
                continue;
            }

            try {
                await this.setForeignObjectAsync(id, obj);
            } catch (e) {
                this.log.error((e as Error).message);
            }

            // `obj.def` is never set in io-package.json (the defaults live in `common.def`), so in
            // practice only string states are initialised here. Kept as it was to not write values
            // into existing installations that never had any.
            if (obj.type === 'state' && (obj.def !== undefined || obj.common.type === 'string')) {
                await this.setForeignStateAsync(id, obj.def !== undefined ? obj.def : '', true);
            }
        }
    }

    private async checkNames(): Promise<void> {
        for (const channel of this.channels) {
            try {
                const obj = await this.getForeignObjectAsync(channel);
                if (obj && obj.common.name !== `DWD Warnung für ${this.config.region}`) {
                    obj.common.name = `DWD Warnung für ${this.config.region}`;
                    await this.setForeignObjectAsync(obj._id, obj);
                }
            } catch (e) {
                this.log.error((e as Error).message);
            }
        }
        this.channels.sort();
        this.log.debug(`Sorted Channels: ${JSON.stringify(this.channels)}`);
    }

    private readWarnings(): void {
        getFile(this.config.url, (err, data) => void this.processFile(err, data));
    }

    private async placeWarning(channelName: string, warning?: DwdWarning): Promise<void> {
        const warnObj: Partial<DwdWarning> = warning || {};
        // warnObj.start/end are milliseconds since epoch and have type number
        await this.setForeignStateAsync(`${channelName}.begin`, warnObj.start || null, true);
        await this.setForeignStateAsync(`${channelName}.end`, warnObj.end || null, true);
        await this.setForeignStateAsync(
            `${channelName}.severity`,
            warnObj.level !== undefined && warnObj.level > 1 ? warnObj.level - 1 : 0,
            true,
        );
        await this.setForeignStateAsync(
            `${channelName}.level`,
            warnObj.level === undefined || warnObj.level === null ? null : parseInt(String(warnObj.level), 10),
            true,
        );
        await this.setForeignStateAsync(
            `${channelName}.type`,
            warnObj.type === undefined || warnObj.type === null ? null : parseInt(String(warnObj.type), 10),
            true,
        );
        await this.setForeignStateAsync(`${channelName}.text`, warnObj.event || '', true);
        await this.setForeignStateAsync(`${channelName}.headline`, warnObj.headline || '', true);
        await this.setForeignStateAsync(`${channelName}.description`, warnObj.description || '', true);
        await this.setForeignStateAsync(`${channelName}.instruction`, warnObj.instruction || '', true);
        await this.setForeignStateAsync(`${channelName}.object`, JSON.stringify(warnObj), true);
        this.log.debug(`Add warning "${channelName}": ${warnObj.start ? new Date(warnObj.start).toISOString() : ''}`);

        if (this.config.land && warnObj.type !== undefined && warnObj.type !== null) {
            await this.setForeignStateAsync(
                `${channelName}.map`,
                `https://www.dwd.de/DWD/warnungen/warnapp_gemeinden/json/warnungen_gemeinde_map_${this.config.land}_${MAPS[warnObj.type]}.png`,
                true,
            );
        } else {
            await this.setForeignStateAsync(`${channelName}.map`, '', true);
        }
    }

    private async processFile(err: string | null, data: DwdWarningsFile | null): Promise<void> {
        if (this.isStopped) {
            this.log.error('Kill Switch timeout triggered before response received');
            this.terminateAdapter();
            return;
        }

        if (data) {
            await this.placeRegionWarnings(data);
        } else {
            this.log.error(`Empty or invalid JSON: ${err}`);
        }

        // The warncell comes from another source, so it is updated even when warnings.json failed
        await this.readWarncellWarnings();

        if (data) {
            await this.setStateAsync('info.lastUpdate', Date.now(), true);
        }
        this.terminateAdapter();
    }

    private async placeRegionWarnings(data: DwdWarningsFile): Promise<void> {
        this.log.debug(`Data: ${JSON.stringify(data)}`);
        this.log.debug(`Find Warnings for Region: ${this.config.region}`);

        if (data.warnings) {
            const warnings: DwdWarning[] = [];
            for (const w of Object.keys(data.warnings)) {
                const arr = data.warnings[w];
                for (let a = 0; a < arr.length; a++) {
                    if (arr[a].regionName === this.config.region) {
                        // filter out similar entries
                        if (!warnings.find(r => JSON.stringify(r) === JSON.stringify(arr[a]))) {
                            warnings.push(arr[a]);
                        }
                    }
                }
            }

            warnings.sort(sort);
            this.log.debug(`Sorted Warnings: ${JSON.stringify(warnings)}`);
            await this.setForeignStateAsync(`${this.namespace}.numberOfWarnings`, warnings.length, true);

            for (let c = 0; c < this.channels.length; c++) {
                this.log.debug(`Write warnings for ${c}: ${this.channels[c]} = ${JSON.stringify(warnings[c])}`);
                await this.placeWarning(this.channels[c], warnings[c]);
            }
        }
    }

    /** A copy of an `instanceObjects` entry of io-package.json, without its `_id` */
    private template(id: string): ioBroker.SettableObject {
        const obj = this.getIoPackage().instanceObjects.find(o => o._id === id);
        if (!obj) {
            throw new Error(`Object ${id} not found in io-package.json`);
        }
        const { type, common, native } = JSON.parse(JSON.stringify(obj)) as InstanceObject;
        return { type, common, native } as ioBroker.SettableObject;
    }

    /**
     * Create, update or remove the objects below `warncell.` to match the configured warncell.
     *
     * The layout is the one of the region: a `numberOfWarnings` state and `config.warnings` channels
     * `warning`, `warning1`, `warning2`, ... built from the same templates. Nothing exists while no
     * warncell is configured. The name of the warncell is looked up once and cached in the native
     * part of the `warncell` folder.
     */
    private async syncWarncellObjects(): Promise<void> {
        const warncellId = this.config.warncellId;
        const folderId = `${this.namespace}.warncell`;
        const folder = await this.getForeignObjectAsync(folderId);

        if (!warncellId) {
            if (folder) {
                this.log.info('No warncell configured any more, deleting the warncell objects');
                await this.delForeignObjectAsync(folderId, { recursive: true });
            }
            return;
        }
        if (!WARNCELL_ID_PATTERN.test(warncellId)) {
            this.log.warn(
                `Invalid warncell ID "${warncellId}": expected the 9 digit ID of a municipality, starting with 7 or 8`,
            );
            return;
        }

        let name: string | undefined =
            folder?.native?.warncellId === warncellId ? (folder.native.name as string | undefined) : undefined;
        if (!name) {
            const { error, data } = await getFileAsync<WfsFeatureCollection<WarncellAreaProperties>>(
                warncellAreaUrl(warncellId),
                1,
            );
            if (data && Array.isArray(data.features)) {
                if (!data.features.length) {
                    this.log.warn(`The DWD does not know the warncell ${warncellId}`);
                    return;
                }
                name = data.features[0].properties?.NAME;
            } else {
                // Not cached, so the next run tries again
                this.log.warn(`Cannot read the name of warncell ${warncellId}: ${error}`);
            }
        }
        const label = name || `Warnzelle ${warncellId}`;

        const folderObj: ioBroker.SettableFolderObject = {
            type: 'folder',
            common: { name: `DWD Warnzelle ${label}` },
            native: name ? { warncellId, name } : {},
        };
        if (
            !folder ||
            JSON.stringify(folder.common.name) !== JSON.stringify(folderObj.common.name) ||
            JSON.stringify(folder.native) !== JSON.stringify(folderObj.native)
        ) {
            await this.setForeignObjectAsync(folderId, folderObj);
        }

        const existing = await this.getForeignObjectsAsync(`${folderId}.*`);

        // more channels than configured
        for (const id of Object.keys(existing)) {
            const m = id.match(/\.warncell\.warning(\d*)$/);
            if (m && (parseInt(m[1], 10) || 0) >= this.config.warnings) {
                this.log.debug(`Delete channel ${id}`);
                await this.delForeignObjectAsync(id, { recursive: true });
            }
        }

        // relative to the folder: `numberOfWarnings`, `warning3.begin`, ...
        const toCreate: string[] = [];
        if (!existing[`${folderId}.numberOfWarnings`]) {
            toCreate.push('numberOfWarnings');
        }
        this.warncellChannels = [];
        const channelName = `DWD Warnung für ${label}`;
        for (let i = 0; i < this.config.warnings; i++) {
            // the first channel has no number, like the first one of the region
            const channel = `${folderId}.warning${i || ''}`;
            this.warncellChannels.push(channel);

            const channelObj = existing[channel];
            if (!channelObj) {
                const obj = this.template('warning');
                if (obj.common) {
                    obj.common.name = channelName;
                }
                await this.setForeignObjectAsync(channel, obj);
            } else if (channelObj.common.name !== channelName) {
                channelObj.common.name = channelName;
                await this.setForeignObjectAsync(channel, channelObj);
            }
            for (const state of WARNING_STATES) {
                if (!existing[`${channel}.${state}`]) {
                    toCreate.push(`warning${i || ''}.${state}`);
                }
            }
        }

        for (const id of toCreate) {
            // `warning3.begin` -> template `warning.begin`
            await this.setForeignObjectAsync(`${folderId}.${id}`, this.template(id.replace(/^warning\d*/, 'warning')));
        }
    }

    /** Read the warnings of the configured warncell from the DWD geoserver and write them into `warncell.` */
    private async readWarncellWarnings(): Promise<void> {
        if (!this.warncellChannels.length) {
            return;
        }
        const warncellId = this.config.warncellId;

        const { error, data } = await getFileAsync<WfsFeatureCollection<WarncellWarningProperties>>(
            warncellWarningsUrl(warncellId),
        );
        if (!data || !Array.isArray(data.features)) {
            // the old values stay, as they do for the region when warnings.json cannot be read
            this.log.warn(`Cannot read the warnings of warncell ${warncellId}: ${error || 'invalid answer'}`);
            return;
        }

        const warnings: DwdWarning[] = [];
        for (const feature of data.features) {
            if (!feature?.properties || !isShownWarning(feature.properties)) {
                continue;
            }
            const warning = toDwdWarning(feature.properties);
            if (!warnings.find(r => JSON.stringify(r) === JSON.stringify(warning))) {
                warnings.push(warning);
            }
        }
        warnings.sort(sort);
        this.log.debug(`Warnings for warncell ${warncellId}: ${JSON.stringify(warnings)}`);

        await this.setForeignStateAsync(`${this.namespace}.warncell.numberOfWarnings`, warnings.length, true);
        for (let c = 0; c < this.warncellChannels.length; c++) {
            await this.placeWarning(this.warncellChannels[c], warnings[c]);
        }
    }

    private async doRainStates(device: string, value: string, name: string): Promise<void> {
        await this.setObjectNotExistsAsync(device, {
            type: 'state',
            common: {
                name,
                type: 'string',
                role: 'weather.radar.rain',
                read: true,
                write: false,
            },
            native: {},
        });
        await this.setStateAsync(device, value, true);
    }

    private async doRainRadar(): Promise<void> {
        let sysConf: ioBroker.SystemConfigObject | null | undefined;
        try {
            sysConf = await this.getForeignObjectAsync('system.config');
        } catch {
            // ignore
        }
        if (!sysConf) {
            this.log.warn('Can not read iobroker system configuration. Disable Rain Radar.');
            return;
        }
        const lat = sysConf.common.latitude;
        const long = sysConf.common.longitude;
        if (!lat || !long) {
            this.log.warn('No geo coordinates found in iobroker system configuration. Disable Rain Radar.');
            return;
        }

        const url = (zoom: number, size: string, voor: number): string =>
            `https://gadgets.buienradar.nl/gadget/zoommap/?lat=${lat}&lng=${long}&overname=2&zoom=${zoom}&size=${size}&voor=${voor}`;

        // `Current.City_small` is missing on purpose - it never existed in this adapter
        await this.doRainStates('rainradar.Current.City_medium', url(13, '2', 0), '256x256px');
        await this.doRainStates('rainradar.Current.City_tall', url(13, '2b', 0), '330x330px');
        await this.doRainStates('rainradar.Current.City_huge', url(13, '3', 0), '550x512px');
        await this.doRainStates('rainradar.Current.Region_small', url(11, '1', 0), '120x220px');
        await this.doRainStates('rainradar.Current.Region_medium', url(11, '2', 0), '256x256px');
        await this.doRainStates('rainradar.Current.Region_tall', url(11, '2b', 0), '330x330px');
        await this.doRainStates('rainradar.Current.Region_huge', url(11, '3', 0), '550x512px');
        await this.doRainStates('rainradar.Current.Province_small', url(8, '1', 0), '120x220px');
        await this.doRainStates('rainradar.Current.Province_medium', url(8, '2', 0), '256x256px');
        await this.doRainStates('rainradar.Current.Province_tall', url(8, '2b', 0), '330x330px');
        await this.doRainStates('rainradar.Current.Province_huge', url(8, '3', 0), '550x512px');
        await this.doRainStates('rainradar.Current.Country_small', url(6, '1', 0), '120x220px');
        await this.doRainStates('rainradar.Current.Country_medium', url(6, '2', 0), '256x256px');
        await this.doRainStates('rainradar.Current.Country_tall', url(6, '2b', 0), '330x330px');
        await this.doRainStates('rainradar.Current.Country_huge', url(6, '3', 0), '550x512px');
        await this.doRainStates('rainradar.Forecast_3h.City_small', url(13, '1', 1), '120x220px');
        await this.doRainStates('rainradar.Forecast_3h.City_medium', url(13, '2', 1), '256x256px');
        await this.doRainStates('rainradar.Forecast_3h.City_tall', url(13, '2b', 1), '330x330px');
        await this.doRainStates('rainradar.Forecast_3h.City_huge', url(13, '3', 1), '550x512px');
        await this.doRainStates('rainradar.Forecast_3h.Region_small', url(11, '1', 1), '120x220px');
        await this.doRainStates('rainradar.Forecast_3h.Region_medium', url(11, '2', 1), '256x256px');
        await this.doRainStates('rainradar.Forecast_3h.Region_tall', url(11, '2b', 1), '330x330px');
        await this.doRainStates('rainradar.Forecast_3h.Region_huge', url(11, '3', 1), '550x512px');
        await this.doRainStates('rainradar.Forecast_3h.Province_small', url(8, '1', 1), '120x220px');
        await this.doRainStates('rainradar.Forecast_3h.Province_medium', url(8, '2', 1), '256x256px');
        await this.doRainStates('rainradar.Forecast_3h.Province_tall', url(8, '2b', 1), '330x330px');
        await this.doRainStates('rainradar.Forecast_3h.Province_huge', url(8, '3', 1), '550x512px');
        await this.doRainStates('rainradar.Forecast_3h.Country_small', url(6, '1', 1), '120x220px');
        await this.doRainStates('rainradar.Forecast_3h.Country_medium', url(6, '2', 1), '256x256px');
        await this.doRainStates('rainradar.Forecast_3h.Country_tall', url(6, '2b', 1), '330x330px');
        await this.doRainStates('rainradar.Forecast_3h.Country_huge', url(6, '3', 1), '550x512px');
    }
}

if (require.main !== module) {
    // Export the constructor in compact mode
    module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new Dwd(options);
} else {
    // otherwise start the instance directly
    (() => new Dwd())();
}
