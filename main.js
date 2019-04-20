/* jshint -W097 */// jshint strict:false
/*jslint node: true */

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

const utils = require('@iobroker/adapter-core'); // Get common adapter utils
const tools   = require(__dirname + '/lib/tools');

let channels = [];
let iopkg;

let adapter = new utils.Adapter({
    name: 'dwd',
    useFormatDate: true
});

adapter.on('ready', () => {
    adapter.config.warnings = parseInt(adapter.config.warnings, 10) || 1;

    adapter.config.url = adapter.config.url || 'http://www.dwd.de/DWD/warnungen/warnapp/json/warnings.json';

    adapter.getForeignObjects(adapter.namespace + '.*', 'state', (err, states) => {
        for (const s in states) {
            if (states.hasOwnProperty(s)) {
                let chName = s.split('.');
                chName.pop();
                chName = chName.join('.');
                if (channels.indexOf(chName) === -1) channels.push(chName);
            }
        }
        if (channels.length > adapter.config.warnings) {
            // delete warnings
            let toDelete = [];
            for (let i = adapter.config.warnings; i < channels.length; i++) {
                toDelete.push(channels[i] + '.begin');
                toDelete.push(channels[i] + '.end');
                toDelete.push(channels[i] + '.severity');
                toDelete.push(channels[i] + '.level');
                toDelete.push(channels[i] + '.type');                
                toDelete.push(channels[i] + '.text');
                toDelete.push(channels[i] + '.headline');
                toDelete.push(channels[i] + '.description');
                toDelete.push(channels[i] + '.object');
                toDelete.push(channels[i] + '.map');
                toDelete.push(channels[i]);
            }
            deleteObjects(toDelete);
            channels.splice(adapter.config.warnings, channels.length);
            checkNames(ready);
        } else if (channels.length < adapter.config.warnings){
            let toAdd = [];
            // add warnings
            for (let j = channels.length; j < adapter.config.warnings; j++) {
                toAdd.push(adapter.namespace + '.warning' + j);
                toAdd.push(adapter.namespace + '.warning' + j + '.begin');
                toAdd.push(adapter.namespace + '.warning' + j + '.end');
                toAdd.push(adapter.namespace + '.warning' + j + '.severity');
                toAdd.push(adapter.namespace + '.warning' + j + '.level');
                toAdd.push(adapter.namespace + '.warning' + j + '.type');
                toAdd.push(adapter.namespace + '.warning' + j + '.text');
                toAdd.push(adapter.namespace + '.warning' + j + '.headline');
                toAdd.push(adapter.namespace + '.warning' + j + '.description');
                toAdd.push(adapter.namespace + '.warning' + j + '.object');
                toAdd.push(adapter.namespace + '.warning' + j + '.map');
                channels.push(adapter.namespace + '.warning' + j);
            }
            addObjects(toAdd, () => checkNames(ready));
        } else {
            checkNames(ready);
        }
    });
    if (adapter.config.RainRadar === true) {
        doRainradar();
    }
});

function deleteObjects(objs) {
    if (!objs && !objs.length) {
        return;
    }
    const id = objs.pop();
    adapter.delForeignObject(id, err => {
        if (err) return;
        adapter.delForeignState(id, err => {
            setTimeout(deleteObjects, 0, objs);
        });
    });
}

function addObjects(objs, cb) {
    iopkg = iopkg || require(__dirname + '/io-package.json');

    if (!objs || !objs.length) {
        cb && cb();
        return;
    }
    const id = objs.pop();
    const _id = id.replace(/warning\d+/, 'warning');
    for (let i = 0; i < iopkg.instanceObjects.length; i++) {
        if (adapter.namespace + '.' + iopkg.instanceObjects[i]._id === _id) {
            const obj = iopkg.instanceObjects[i];
            adapter.setForeignObject(id, obj, err => {
                if (err) adapter.log.error(err);
                if (obj.type === 'state') {
                    adapter.setForeignState(id, '', true, err => {
                        setTimeout(addObjects, 0, objs, cb);
                    });
                } else {
                    setTimeout(addObjects, 0, objs, cb);
                }
            });
            return;
        }
    }
    adapter.log.warn('Object ' + id + ' not found');
    setTimeout(addObjects, 0, objs, cb);
}

function checkNames(cb) {
    for (let j = 0; j < channels.length; j++) {
        adapter.getForeignObject(channels[j], (err, obj) => {
            if (obj && obj.common.name !== 'DWD Warnung für ' + adapter.config.region) {
                obj.common.name = 'DWD Warnung für ' + adapter.config.region;
                adapter.setForeignObject(obj._id, obj, err => {
                    if (err) adapter.log.error(err);
                });
            }
        });
    }
    channels.sort();
    cb && cb();
}

function ready() {
    tools.getFile(adapter.config.url, processFile);
}

const maps = ['gewitter', 'sturm', 'regen', 'schnee', 'nebel', 'frost', 'glatteis', 'tauwetter', 'hitze', 'uv'];

function placeWarning(channelName, warnObj) {
    warnObj = warnObj || {};
    
    adapter.setForeignState(channelName + '.begin',         tools.formatDate(adapter.formatDate, warnObj.start),  true);
    adapter.setForeignState(channelName + '.end',           tools.formatDate(adapter.formatDate, warnObj.end),    true);
    adapter.setForeignState(channelName + '.severity',      warnObj.level > 1 ? warnObj.level - 1 : 0,            true);
    adapter.setForeignState(channelName + '.level',         warnObj.level === undefined || warnObj.level === null ? null : warnObj.level,        true);
    adapter.setForeignState(channelName + '.type',          warnObj.type === undefined || warnObj.type === null ? null : warnObj.type,        true);
    adapter.setForeignState(channelName + '.text',          warnObj.event || '',        true);
    adapter.setForeignState(channelName + '.headline',      warnObj.headline || '',     true);
    adapter.setForeignState(channelName + '.description',   warnObj.description || '',  true);
    adapter.setForeignState(channelName + '.object',        JSON.stringify(warnObj),    true);
    adapter.log.debug('Add warning "' + channelName + '": ' + tools.formatDate(adapter.formatDate, warnObj.start));
    if (adapter.config.land && warnObj.type !== undefined && warnObj.type !== null) {
        adapter.setForeignState(channelName + '.map',        `https://www.dwd.de/DWD/warnungen/warnapp_gemeinden/json/warnungen_gemeinde_map_${adapter.config.land}_${maps[warnObj.type]}.png`, true);
    } else {
        adapter.setForeignState(channelName + '.map',        '',    true);
    }

}

function processFile(err, data) {
    if (!data) {
        adapter.log.error('Empty or invalid JSON: ' + err);
        setTimeout(() => adapter.stop());
        return;
    }

    if (data.warnings) {
        let warnings = [];
        for (const w in data.warnings) {
            if (data.warnings.hasOwnProperty(w)) {
                const arr = data.warnings[w];
                for (let a = 0; a < arr.length; a++) {
                    if (arr[a].regionName === adapter.config.region) {
                        // filter out similar entries
                        if (!warnings.find(r => JSON.stringify(r) === JSON.stringify(arr[a]))) {
                            warnings.push(arr[a]);
                        }
                    }
                }
            }
        }
        warnings.sort(tools.sort);

        for (let c = 0; c < channels.length; c++) {
            placeWarning(channels[c], warnings[c]);
        }
    }
    setTimeout(() => adapter.stop());
}

setTimeout(() => {
    adapter.log.info('force terminating after 4 minutes');
    adapter.stop();
}, 240000);

async function doRainradar(){
    const sys_conf = await adapter.getForeignObjectAsync("system.config");
    if (!sys_conf) return;
    const lat = sys_conf.common.latitude;
    const long = sys_conf.common.longitude;

    doRainStates("rainradar.Current.City_small", "https://gadgets.buienradar.nl/gadget/zoommap/?lat=" + lat + "&lng=" + long + "&overname=2&zoom=13&size=1&voor=0", "120x220px");
    doRainStates("rainradar.Current.City_medium", "https://gadgets.buienradar.nl/gadget/zoommap/?lat=" + lat + "&lng=" + long + "&overname=2&zoom=13&size=2&voor=0", "256x256px");
    doRainStates("rainradar.Current.City_tall", "https://gadgets.buienradar.nl/gadget/zoommap/?lat=" + lat + "&lng=" + long + "&overname=2&zoom=13&size=2b&voor=0", "330x330px");
    doRainStates("rainradar.Current.City_huge", "https://gadgets.buienradar.nl/gadget/zoommap/?lat=" + lat + "&lng=" + long + "&overname=2&zoom=13&size=3&voor=0", "550x512px");
    doRainStates("rainradar.Current.Region_small", "https://gadgets.buienradar.nl/gadget/zoommap/?lat=" + lat + "&lng=" + long + "&overname=2&zoom=11&size=1&voor=0", "120x220px");
    doRainStates("rainradar.Current.Region_medium", "https://gadgets.buienradar.nl/gadget/zoommap/?lat=" + lat + "&lng=" + long + "&overname=2&zoom=11&size=2&voor=0", "256x256px");
    doRainStates("rainradar.Current.Region_tall", "https://gadgets.buienradar.nl/gadget/zoommap/?lat=" + lat + "&lng=" + long + "&overname=2&zoom=11&size=2b&voor=0", "330x330px");
    doRainStates("rainradar.Current.Region_huge", "https://gadgets.buienradar.nl/gadget/zoommap/?lat=" + lat + "&lng=" + long + "&overname=2&zoom=11&size=3&voor=0", "550x512px");
    doRainStates("rainradar.Current.Province_small", "https://gadgets.buienradar.nl/gadget/zoommap/?lat=" + lat + "&lng=" + long + "&overname=2&zoom=8&size=1&voor=0", "120x220px");
    doRainStates("rainradar.Current.Province_medium", "https://gadgets.buienradar.nl/gadget/zoommap/?lat=" + lat + "&lng=" + long + "&overname=2&zoom=8&size=2&voor=0", "256x256px");
    doRainStates("rainradar.Current.Province_tall", "https://gadgets.buienradar.nl/gadget/zoommap/?lat=" + lat + "&lng=" + long + "&overname=2&zoom=8&size=2b&voor=0", "330x330px");
    doRainStates("rainradar.Current.Province_huge", "https://gadgets.buienradar.nl/gadget/zoommap/?lat=" + lat + "&lng=" + long + "&overname=2&zoom=8&size=3&voor=0", "550x512px");
    doRainStates("rainradar.Current.Country_small", "https://gadgets.buienradar.nl/gadget/zoommap/?lat=" + lat + "&lng=" + long + "&overname=2&zoom=6&size=1&voor=0", "120x220px");
    doRainStates("rainradar.Current.Country_medium", "https://gadgets.buienradar.nl/gadget/zoommap/?lat=" + lat + "&lng=" + long + "&overname=2&zoom=6&size=2&voor=0", "256x256px");
    doRainStates("rainradar.Current.Country_tall", "https://gadgets.buienradar.nl/gadget/zoommap/?lat=" + lat + "&lng=" + long + "&overname=2&zoom=6&size=2b&voor=0", "330x330px");
    doRainStates("rainradar.Current.Country_huge", "https://gadgets.buienradar.nl/gadget/zoommap/?lat=" + lat + "&lng=" + long + "&overname=2&zoom=6&size=3&voor=0", "550x512px");
    doRainStates("rainradar.Forecast_3h.City_small", "https://gadgets.buienradar.nl/gadget/zoommap/?lat=" + lat + "&lng=" + long + "&overname=2&zoom=13&size=1&voor=1", "120x220px");
    doRainStates("rainradar.Forecast_3h.City_medium", "https://gadgets.buienradar.nl/gadget/zoommap/?lat=" + lat + "&lng=" + long + "&overname=2&zoom=13&size=2&voor=1", "256x256px");
    doRainStates("rainradar.Forecast_3h.City_tall", "https://gadgets.buienradar.nl/gadget/zoommap/?lat=" + lat + "&lng=" + long + "&overname=2&zoom=13&size=2b&voor=1", "330x330px");
    doRainStates("rainradar.Forecast_3h.City_huge", "https://gadgets.buienradar.nl/gadget/zoommap/?lat=" + lat + "&lng=" + long + "&overname=2&zoom=13&size=3&voor=1", "550x512px");
    doRainStates("rainradar.Forecast_3h.Region_small", "https://gadgets.buienradar.nl/gadget/zoommap/?lat=" + lat + "&lng=" + long + "&overname=2&zoom=11&size=1&voor=1", "120x220px");
    doRainStates("rainradar.Forecast_3h.Region_medium", "https://gadgets.buienradar.nl/gadget/zoommap/?lat=" + lat + "&lng=" + long + "&overname=2&zoom=11&size=2&voor=1", "256x256px");
    doRainStates("rainradar.Forecast_3h.Region_tall", "https://gadgets.buienradar.nl/gadget/zoommap/?lat=" + lat + "&lng=" + long + "&overname=2&zoom=11&size=2b&voor=1", "330x330px");
    doRainStates("rainradar.Forecast_3h.Region_huge", "https://gadgets.buienradar.nl/gadget/zoommap/?lat=" + lat + "&lng=" + long + "&overname=2&zoom=11&size=3&voor=1", "550x512px");
    doRainStates("rainradar.Forecast_3h.Province_small", "https://gadgets.buienradar.nl/gadget/zoommap/?lat=" + lat + "&lng=" + long + "&overname=2&zoom=8&size=1&voor=1", "120x220px");
    doRainStates("rainradar.Forecast_3h.Province_medium", "https://gadgets.buienradar.nl/gadget/zoommap/?lat=" + lat + "&lng=" + long + "&overname=2&zoom=8&size=2&voor=1", "256x256px");
    doRainStates("rainradar.Forecast_3h.Province_tall", "https://gadgets.buienradar.nl/gadget/zoommap/?lat=" + lat + "&lng=" + long + "&overname=2&zoom=8&size=2b&voor=1", "330x330px");
    doRainStates("rainradar.Forecast_3h.Province_huge", "https://gadgets.buienradar.nl/gadget/zoommap/?lat=" + lat + "&lng=" + long + "&overname=2&zoom=8&size=3&voor=1", "550x512px");
    doRainStates("rainradar.Forecast_3h.Country_small", "https://gadgets.buienradar.nl/gadget/zoommap/?lat=" + lat + "&lng=" + long + "&overname=2&zoom=6&size=1&voor=1", "120x220px");
    doRainStates("rainradar.Forecast_3h.Country_medium", "https://gadgets.buienradar.nl/gadget/zoommap/?lat=" + lat + "&lng=" + long + "&overname=2&zoom=6&size=2&voor=1", "256x256px");
    doRainStates("rainradar.Forecast_3h.Country_tall", "https://gadgets.buienradar.nl/gadget/zoommap/?lat=" + lat + "&lng=" + long + "&overname=2&zoom=6&size=2b&voor=1", "330x330px");
    doRainStates("rainradar.Forecast_3h.Country_huge", "https://gadgets.buienradar.nl/gadget/zoommap/?lat=" + lat + "&lng=" + long + "&overname=2&zoom=6&size=3&voor=1", "550x512px");
}

// Function to handle state creation
async function doRainStates(device, value, name){	

    // Create objects
    await adapter.setObjectNotExistsAsync(device, {
        type: "state",
        common: {
            name: name,
            type: "string",
            role: "weather.radar.rain",
            read: true,
            write: false,
        },
        native: {},
    });

    // Store links
    await adapter.setState(device, {val : value, ack : true});

}