/* jshint -W097 */
/* jshint strict: false */
/* jslint node: true */

// Message format
//{
//    "start":1497254400000,
//    "end":1497290400000,
//    "regionName":"Kreis Harburg",
//    "level":2,
//    "type":1,
//    "altitudeStart":null,
//    "event":"WINDBÖEN",
//    "headline":"Amtliche WARNUNG vor WINDBÖEN",
//    "description":"Es treten Windböen mit Geschwindigkeiten ... ",
//    "altitudeEnd":null,
//    "stateShort":"NS",
//    "instruction":"",
//    "state":"Niedersachsen"
//}

// Warning levels
// 5 = Warnungen vor extremem Unwetter
// 4 = Unwetterwarnungen
// 3 = Warnungen vor markantem Wetter
// 2 = Wetterwarnungen
// 1 = Vorabinformatio Unwetter

// Warning types
// 0 = Gewitter inklusive Begleiterscheinungen
// 1 = Wind/Sturm/Orkan
// 2 = Stark- und Dauerregen
// 3 = Schneefall/Schneeverwehungen
// 4 = Nebel
// 5 = Frost
// 6 = Glätte/Glatteis
// 7 = Tauwetter
// 8 = Hitzewarnungen
// 9 = UV-Warnungen
//10 = Küstenwarnungen ??
//11 = Binnenseewarnungen ??

'use strict';

const utils       = require('@iobroker/adapter-core'); // Get common adapter utils
const tools       = require('./lib/tools');
const adapterName = require('./package.json').name.split('.').pop();

let channels = [];
let iopkg;
let isStopped = false;
let adapter;

function startAdapter(options) {
    options = options || {};
    Object.assign(options, {
        name: adapterName,
        useFormatDate: true,
        unload: cb => {
            killSwitchTimeout && clearTimeout(killSwitchTimeout);
            killSwitchTimeout = null;
            cb && cb();
        }
    });
    adapter = new utils.Adapter(options);

    adapter.on('ready', async () => {
        adapter.config.warnings = parseInt(adapter.config.warnings, 10) || 1;

        adapter.config.url = adapter.config.url || 'http://www.dwd.de/DWD/warnungen/warnapp/json/warnings.json';

        if (adapter.config.rainRadar === true) {
            await doRainRadar();
        }

        adapter.getForeignObjects(`${adapter.namespace}.*`, 'state', async (err, states) => {
            for (const s in states) {
                if (states.hasOwnProperty(s)) {
                    if (!s.startsWith(`${adapter.namespace}.warning`)) {
                        continue;
                    }
                    let chName = s.split('.');
                    chName.pop();
                    chName = chName.join('.');
                    !channels.includes(chName) && channels.push(chName);
                }
            }
            adapter.log.debug(`Warnings configured: ${adapter.config.warnings}`);
            adapter.log.debug(`Existing Channels: ${JSON.stringify(channels)}`);
            let toDelete = [];
            let toAdd = [];
            if (channels.length > adapter.config.warnings) {
                // delete warnings
                for (let i = adapter.config.warnings; i < channels.length; i++) {
                    adapter.log.debug(`Delete channel ${i}: ${channels[i]}`);
                    toDelete.push(`${channels[i]}.begin`);
                    toDelete.push(`${channels[i]}.end`);
                    toDelete.push(`${channels[i]}.severity`);
                    toDelete.push(`${channels[i]}.level`);
                    toDelete.push(`${channels[i]}.type`);
                    toDelete.push(`${channels[i]}.text`);
                    toDelete.push(`${channels[i]}.headline`);
                    toDelete.push(`${channels[i]}.description`);
                    toDelete.push(`${channels[i]}.instruction`);
                    toDelete.push(`${channels[i]}.object`);
                    toDelete.push(`${channels[i]}.map`);
                    toDelete.push(channels[i]);
                }
                await deleteObjects(toDelete);
                channels.splice(adapter.config.warnings, channels.length);
            }
            if (channels.length < adapter.config.warnings) {
                // add warnings
                for (let j = channels.length; j < adapter.config.warnings; j++) {
                    adapter.log.debug(`Add channel ${j}: ${channels[j]}`);
                    toAdd.push(`${adapter.namespace}.warning${j}`);
                    toAdd.push(`${adapter.namespace}.warning${j}.begin`);
                    toAdd.push(`${adapter.namespace}.warning${j}.end`);
                    toAdd.push(`${adapter.namespace}.warning${j}.severity`);
                    toAdd.push(`${adapter.namespace}.warning${j}.level`);
                    toAdd.push(`${adapter.namespace}.warning${j}.type`);
                    toAdd.push(`${adapter.namespace}.warning${j}.text`);
                    toAdd.push(`${adapter.namespace}.warning${j}.headline`);
                    toAdd.push(`${adapter.namespace}.warning${j}.description`);
                    toAdd.push(`${adapter.namespace}.warning${j}.instruction`);
                    toAdd.push(`${adapter.namespace}.warning${j}.object`);
                    toAdd.push(`${adapter.namespace}.warning${j}.map`);
                    channels.push(`${adapter.namespace}.warning${j}`);
                }
                toAdd.push(`${adapter.namespace}.numberOfWarnings`);
            }
            for (let j = 1; j < channels.length; j++) {
                if (!states[`${adapter.namespace}.warning${j}.begin`]) {
                    toAdd.push(`${adapter.namespace}.warning${j}.begin`);
                }
                if (!states[`${adapter.namespace}.warning${j}.end`]) {
                    toAdd.push(`${adapter.namespace}.warning${j}.end`);
                }
                if (!states[`${adapter.namespace}.warning${j}.severity`]) {
                    toAdd.push(`${adapter.namespace}.warning${j}.severity`);
                }
                if (!states[`${adapter.namespace}.warning${j}.level`]) {
                    toAdd.push(`${adapter.namespace}.warning${j}.level`);
                }
                if (!states[`${adapter.namespace}.warning${j}.type`]) {
                    toAdd.push(`${adapter.namespace}.warning${j}.type`);
                }
                if (!states[`${adapter.namespace}.warning${j}.text`]) {
                    toAdd.push(`${adapter.namespace}.warning${j}.text`);
                }
                if (!states[`${adapter.namespace}.warning${j}.headline`]) {
                    toAdd.push(`${adapter.namespace}.warning${j}.headline`);
                }
                if (!states[`${adapter.namespace}.warning${j}.description`]) {
                    toAdd.push(`${adapter.namespace}.warning${j}.description`);
                }
                if (!states[`${adapter.namespace}.warning${j}.instruction`]) {
                    toAdd.push(`${adapter.namespace}.warning${j}.instruction`);
                }
                if (!states[`${adapter.namespace}.warning${j}.object`]) {
                    toAdd.push(`${adapter.namespace}.warning${j}.object`);
                }
                if (!states[`${adapter.namespace}.warning${j}.map`]) {
                    toAdd.push(`${adapter.namespace}.warning${j}.map`);
                }
            }
            if (toAdd.length) {
                adapter.log.debug(`Add ${toAdd.length} missing states: ${JSON.stringify(toAdd)}`);
                addObjects(toAdd, async () => {
                    adapter.log.debug(`Final Channels: ${JSON.stringify(channels)}`);
                    await checkNames();
                    ready();
                });
            } else {
                adapter.log.debug(`Final Channels: ${JSON.stringify(channels)}`);
                await checkNames();
                ready();
            }
        });
    });

    return adapter;
}

async function deleteObjects(objs) {
    if (!objs && !objs.length) {
        return;
    }
    for (let id of objs) {
        try {
            await adapter.delForeignObjectAsync(id);
            await adapter.delForeignState(id);
        } catch (_err) {
            // ignore
        }
    }
}

function addObjects(objs, cb) {
    iopkg = iopkg || require('./io-package.json');

    if (!objs || !objs.length) {
        return cb && cb();
    }
    const id = objs.pop();
    const _id = id.replace(/warning\d+/, 'warning');
    for (let i = 0; i < iopkg.instanceObjects.length; i++) {
        if (`${adapter.namespace}.${iopkg.instanceObjects[i]._id}` === _id) {
            const obj = iopkg.instanceObjects[i];
            return adapter.setForeignObject(id, obj, err => {
                err && adapter.log.error(err);
                if (obj.type === 'state' && (obj.def !== undefined || obj.common.type === 'string')) {
                    adapter.setForeignState(id, obj.def !== undefined ? obj.def : '', true, err =>
                        setImmediate(addObjects, objs, cb));
                } else {
                    setImmediate(addObjects, objs, cb);
                }
            });
        }
    }
    adapter.log.warn(`Object ${id} not found`);
    setImmediate(addObjects, objs, cb);
}

async function checkNames() {
    for (let j = 0; j < channels.length; j++) {
        try {
            const obj = await adapter.getForeignObjectAsync(channels[j]);
            if (obj && obj.common.name !== `DWD Warnung für ${adapter.config.region}`) {
                obj.common.name = `DWD Warnung für ${adapter.config.region}`;
                await adapter.setForeignObject(obj._id, obj);
            }
        } catch (error) {
            adapter.log.error(error);
        }
    }
    channels.sort();
    adapter.log.debug(`Sorted Channels: ${JSON.stringify(channels)}`);
}

function ready() {
    tools.getFile(adapter.config.url, processFile);
}

const maps = ['gewitter', 'sturm', 'regen', 'schnee', 'nebel', 'frost', 'glatteis', 'tauwetter', 'hitze', 'uv'];

async function placeWarning(channelName, warnObj) {
    warnObj = warnObj || {};
    // warnObj.start/end are Milliseconds since epoch and have type number
    await adapter.setForeignStateAsync(`${channelName}.begin`,         warnObj.start || null, true);
    await adapter.setForeignStateAsync(`${channelName}.end`,           warnObj.end || null, true);
    await adapter.setForeignStateAsync(`${channelName}.severity`,      warnObj.level > 1 ? warnObj.level - 1 : 0, true);
    await adapter.setForeignStateAsync(`${channelName}.level`,         warnObj.level === undefined || warnObj.level === null ? null : parseInt(warnObj.level, 10), true);
    await adapter.setForeignStateAsync(`${channelName}.type`,          warnObj.type  === undefined || warnObj.type  === null ? null : parseInt(warnObj.type, 10), true);
    await adapter.setForeignStateAsync(`${channelName}.text`,          warnObj.event || '',        true);
    await adapter.setForeignStateAsync(`${channelName}.headline`,      warnObj.headline || '',     true);
    await adapter.setForeignStateAsync(`${channelName}.description`,   warnObj.description || '',  true);
    await adapter.setForeignStateAsync(`${channelName}.instruction`,   warnObj.instruction || '',  true);
    await adapter.setForeignStateAsync(`${channelName}.object`,        JSON.stringify(warnObj),    true);
    adapter.log.debug(`Add warning "${channelName}": ${warnObj.start ? new Date(warnObj.start).toISOString() : ''}`);

    if (adapter.config.land && warnObj.type !== undefined && warnObj.type !== null) {
        await adapter.setForeignStateAsync(`${channelName}.map`, `https://www.dwd.de/DWD/warnungen/warnapp_gemeinden/json/warnungen_gemeinde_map_${adapter.config.land}_${maps[warnObj.type]}.png`, true);
    } else {
        await adapter.setForeignStateAsync(`${channelName}.map`, '', true);
    }
}

async function processFile(err, data) {
    if (isStopped) {
        adapter.log.error('Kill Switch timeout triggered before response received');
        killSwitchTimeout && clearTimeout(killSwitchTimeout);
        adapter && adapter.terminate ? adapter.terminate() : process.exit(0);
        return;
    }

    if (!data) {
        adapter.log.error(`Empty or invalid JSON: ${err}`);
        killSwitchTimeout && clearTimeout(killSwitchTimeout);
        isStopped = true;
        adapter && adapter.terminate ? adapter.terminate() : process.exit(0);
        return;
    }

    adapter.log.debug(`Data: ${JSON.stringify(data)}`);
    adapter.log.debug(`Find Warnings for Region: ${adapter.config.region}`);
    if (data.warnings) {
        let warnings = [];
        Object.keys(data.warnings).forEach(w => {
            const arr = data.warnings[w];
            for (let a = 0; a < arr.length; a++) {
                if (arr[a].regionName === adapter.config.region) {
                    // filter out similar entries
                    if (!warnings.find(r => JSON.stringify(r) === JSON.stringify(arr[a]))) {
                        warnings.push(arr[a]);
                    }
                }
            }
        });

        warnings.sort(tools.sort);
        adapter.log.debug(`Sorted Warnings: ${JSON.stringify(warnings)}`);
        await adapter.setForeignStateAsync(`${adapter.namespace}.numberOfWarnings`, warnings.length, true);

        for (let c = 0; c < channels.length; c++) {
            adapter.log.debug(`Write warnings for ${c}: ${channels[c]} = ${JSON.stringify(warnings[c])}`);
            await placeWarning(channels[c], warnings[c]);
        }
    }
    isStopped = true;
    killSwitchTimeout && clearTimeout(killSwitchTimeout);
    adapter && adapter.terminate ? adapter.terminate() : process.exit(0);
}

let killSwitchTimeout = setTimeout(() => {
    killSwitchTimeout = null;
    if (!isStopped) {
        isStopped = true;
        adapter && adapter.log && adapter.log.info('force terminating after 4 minutes');
        adapter && adapter.terminate ? adapter.terminate() : process.exit(0);
    }
}, 240000);

// Function to handle state creation
async function doRainStates(device, value, name){
    // Create objects
    await adapter.setObjectNotExistsAsync(device, {
        type: 'state',
        common: {
            name: name,
            type: 'string',
            role: 'weather.radar.rain',
            read: true,
            write: false,
        },
        native: {}
    });
    await adapter.setStateAsync(device, value, true);
}

async function doRainRadar() {
    let sys_conf;
    try {
        sys_conf = await adapter.getForeignObjectAsync('system.config');
    } catch (err) {
        // ignore
    }
    if (!sys_conf) {
        adapter.log.warn('Can not read iobroker system configuration. Disable Rain Radar.');
        return;
    }
    const lat = sys_conf.common.latitude;
    const long = sys_conf.common.longitude;
    if (!lat || !long) {
        adapter.log.warn('No geo coordinates found in iobroker system configuration. Disable Rain Radar.');
        return;
    }
    await doRainStates('rainradar.Current.City_medium', `https://gadgets.buienradar.nl/gadget/zoommap/?lat=${lat}&lng=${long}&overname=2&zoom=13&size=2&voor=0`, '256x256px');
    await doRainStates('rainradar.Current.City_tall', `https://gadgets.buienradar.nl/gadget/zoommap/?lat=${lat}&lng=${long}&overname=2&zoom=13&size=2b&voor=0`, '330x330px');
    await doRainStates('rainradar.Current.City_huge', `https://gadgets.buienradar.nl/gadget/zoommap/?lat=${lat}&lng=${long}&overname=2&zoom=13&size=3&voor=0`, '550x512px');
    await doRainStates('rainradar.Current.Region_small', `https://gadgets.buienradar.nl/gadget/zoommap/?lat=${lat}&lng=${long}&overname=2&zoom=11&size=1&voor=0`, '120x220px');
    await doRainStates('rainradar.Current.Region_medium', `https://gadgets.buienradar.nl/gadget/zoommap/?lat=${lat}&lng=${long}&overname=2&zoom=11&size=2&voor=0`, '256x256px');
    await doRainStates('rainradar.Current.Region_tall', `https://gadgets.buienradar.nl/gadget/zoommap/?lat=${lat}&lng=${long}&overname=2&zoom=11&size=2b&voor=0`, '330x330px');
    await doRainStates('rainradar.Current.Region_huge', `https://gadgets.buienradar.nl/gadget/zoommap/?lat=${lat}&lng=${long}&overname=2&zoom=11&size=3&voor=0`, '550x512px');
    await doRainStates('rainradar.Current.Province_small', `https://gadgets.buienradar.nl/gadget/zoommap/?lat=${lat}&lng=${long}&overname=2&zoom=8&size=1&voor=0`, '120x220px');
    await doRainStates('rainradar.Current.Province_medium', `https://gadgets.buienradar.nl/gadget/zoommap/?lat=${lat}&lng=${long}&overname=2&zoom=8&size=2&voor=0`, '256x256px');
    await doRainStates('rainradar.Current.Province_tall', `https://gadgets.buienradar.nl/gadget/zoommap/?lat=${lat}&lng=${long}&overname=2&zoom=8&size=2b&voor=0`, '330x330px');
    await doRainStates('rainradar.Current.Province_huge', `https://gadgets.buienradar.nl/gadget/zoommap/?lat=${lat}&lng=${long}&overname=2&zoom=8&size=3&voor=0`, '550x512px');
    await doRainStates('rainradar.Current.Country_small', `https://gadgets.buienradar.nl/gadget/zoommap/?lat=${lat}&lng=${long}&overname=2&zoom=6&size=1&voor=0`, '120x220px');
    await doRainStates('rainradar.Current.Country_medium', `https://gadgets.buienradar.nl/gadget/zoommap/?lat=${lat}&lng=${long}&overname=2&zoom=6&size=2&voor=0`, '256x256px');
    await doRainStates('rainradar.Current.Country_tall', `https://gadgets.buienradar.nl/gadget/zoommap/?lat=${lat}&lng=${long}&overname=2&zoom=6&size=2b&voor=0`, '330x330px');
    await doRainStates('rainradar.Current.Country_huge', `https://gadgets.buienradar.nl/gadget/zoommap/?lat=${lat}&lng=${long}&overname=2&zoom=6&size=3&voor=0`, '550x512px');
    await doRainStates('rainradar.Forecast_3h.City_small', `https://gadgets.buienradar.nl/gadget/zoommap/?lat=${lat}&lng=${long}&overname=2&zoom=13&size=1&voor=1`, '120x220px');
    await doRainStates('rainradar.Forecast_3h.City_medium', `https://gadgets.buienradar.nl/gadget/zoommap/?lat=${lat}&lng=${long}&overname=2&zoom=13&size=2&voor=1`, '256x256px');
    await doRainStates('rainradar.Forecast_3h.City_tall', `https://gadgets.buienradar.nl/gadget/zoommap/?lat=${lat}&lng=${long}&overname=2&zoom=13&size=2b&voor=1`, '330x330px');
    await doRainStates('rainradar.Forecast_3h.City_huge', `https://gadgets.buienradar.nl/gadget/zoommap/?lat=${lat}&lng=${long}&overname=2&zoom=13&size=3&voor=1`, '550x512px');
    await doRainStates('rainradar.Forecast_3h.Region_small', `https://gadgets.buienradar.nl/gadget/zoommap/?lat=${lat}&lng=${long}&overname=2&zoom=11&size=1&voor=1`, '120x220px');
    await doRainStates('rainradar.Forecast_3h.Region_medium', `https://gadgets.buienradar.nl/gadget/zoommap/?lat=${lat}&lng=${long}&overname=2&zoom=11&size=2&voor=1`, '256x256px');
    await doRainStates('rainradar.Forecast_3h.Region_tall', `https://gadgets.buienradar.nl/gadget/zoommap/?lat=${lat}&lng=${long}&overname=2&zoom=11&size=2b&voor=1`, '330x330px');
    await doRainStates('rainradar.Forecast_3h.Region_huge', `https://gadgets.buienradar.nl/gadget/zoommap/?lat=${lat}&lng=${long}&overname=2&zoom=11&size=3&voor=1`, '550x512px');
    await doRainStates('rainradar.Forecast_3h.Province_small', `https://gadgets.buienradar.nl/gadget/zoommap/?lat=${lat}&lng=${long}&overname=2&zoom=8&size=1&voor=1`, '120x220px');
    await doRainStates('rainradar.Forecast_3h.Province_medium', `https://gadgets.buienradar.nl/gadget/zoommap/?lat=${lat}&lng=${long}&overname=2&zoom=8&size=2&voor=1`, '256x256px');
    await doRainStates('rainradar.Forecast_3h.Province_tall', `https://gadgets.buienradar.nl/gadget/zoommap/?lat=${lat}&lng=${long}&overname=2&zoom=8&size=2b&voor=1`, '330x330px');
    await doRainStates('rainradar.Forecast_3h.Province_huge', `https://gadgets.buienradar.nl/gadget/zoommap/?lat=${lat}&lng=${long}&overname=2&zoom=8&size=3&voor=1`, '550x512px');
    await doRainStates('rainradar.Forecast_3h.Country_small', `https://gadgets.buienradar.nl/gadget/zoommap/?lat=${lat}&lng=${long}&overname=2&zoom=6&size=1&voor=1`, '120x220px');
    await doRainStates('rainradar.Forecast_3h.Country_medium', `https://gadgets.buienradar.nl/gadget/zoommap/?lat=${lat}&lng=${long}&overname=2&zoom=6&size=2&voor=1`, '256x256px');
    await doRainStates('rainradar.Forecast_3h.Country_tall', `https://gadgets.buienradar.nl/gadget/zoommap/?lat=${lat}&lng=${long}&overname=2&zoom=6&size=2b&voor=1`, '330x330px');
    await doRainStates('rainradar.Forecast_3h.Country_huge', `https://gadgets.buienradar.nl/gadget/zoommap/?lat=${lat}&lng=${long}&overname=2&zoom=6&size=3&voor=1`, '550x512px');
}

// If started as allInOne/compact mode => return function to create instance
if (module && module.parent) {
    module.exports = startAdapter;
} else {
    // or start the instance directly
    startAdapter();
}
