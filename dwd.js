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


"use strict";

var utils   = require(__dirname + '/lib/utils'); // Get common adapter utils
var tools   = require(__dirname + '/lib/tools');

var channels = [];
var iopkg;

var adapter = utils.Adapter({
    name: 'dwd',
    useFormatDate: true
});

adapter.on('ready', function () {
    adapter.config.warnings = parseInt(adapter.config.warnings, 10) || 1;

    adapter.config.url = adapter.config.url || 'http://www.dwd.de/DWD/warnungen/warnapp/json/warnings.json';

    adapter.getForeignObjects(adapter.namespace + '.*', 'state', function (err, states) {
        for (var s in states) {
            var chName = s.split('.');
            chName.pop();
            chName = chName.join('.');
            if (channels.indexOf(chName) === -1) channels.push(chName);
        }
        if (channels.length > adapter.config.warnings) {
            // delete warnings
            var toDelete = [];
            for (var i = adapter.config.warnings; i < channels.length; i++) {
                toDelete.push(channels[i] + '.begin');
                toDelete.push(channels[i] + '.end');
                toDelete.push(channels[i] + '.severity');
                toDelete.push(channels[i] + '.level');
                toDelete.push(channels[i] + '.type');                
                toDelete.push(channels[i] + '.text');
                toDelete.push(channels[i] + '.headline');
                toDelete.push(channels[i] + '.description');
                toDelete.push(channels[i] + '.object');
                toDelete.push(channels[i]);
            }
            deleteObjects(toDelete);
            channels.splice(adapter.config.warnings, channels.length);
            checkNames(ready);
        } else if (channels.length < adapter.config.warnings){
            var toAdd    = [];
            // add warnings
            for (var j = channels.length; j < adapter.config.warnings; j++) {
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
                channels.push(adapter.namespace + '.warning' + j);
            }
            addObjects(toAdd, function () {
                checkNames(ready);
            });
        } else {
            checkNames(ready);
        }
    });
});

function deleteObjects(objs) {
    if (!objs && !objs.length) {
        return;
    }
    var id = objs.pop();
    adapter.delForeignObject(id, function (err) {
        if (err) adapter.log.error(err);
        adapter.delForeignState(id, function (err) {
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
    var id = objs.pop();
    var _id = id.replace(/warning\d+/, 'warning');
    for (var i = 0; i < iopkg.instanceObjects.length; i++) {
        if (adapter.namespace + '.' + iopkg.instanceObjects[i]._id == _id) {
            var obj = iopkg.instanceObjects[i];
            adapter.setForeignObject(id, obj, function (err) {
                if (err) adapter.log.error(err);
                if (obj.type === 'state') {
                    adapter.setForeignState(id, '', true, function (err) {
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
    for (var j = 0; j < channels.length; j++) {
        adapter.getForeignObject(channels[j], function (err, obj) {
            if (obj && obj.common.name != 'DWD Warnung für ' + adapter.config.region) {
                obj.common.name = 'DWD Warnung für ' + adapter.config.region;
                adapter.setForeignObject(obj._id, obj, function (err) {
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

function placeWarning(channelName, warnObj) {
    warnObj = warnObj || {};
    
    adapter.setForeignState(channelName + '.begin',         tools.formatDate(adapter.formatDate, warnObj.start),  true);
    adapter.setForeignState(channelName + '.end',           tools.formatDate(adapter.formatDate, warnObj.end),    true);
    adapter.setForeignState(channelName + '.severity',      warnObj.level > 1 ? warnObj.level - 1 : 0,            true);
    adapter.setForeignState(channelName + '.level',         warnObj.level || '',        true);
    adapter.setForeignState(channelName + '.type',          warnObj.type  || '',        true);    
    adapter.setForeignState(channelName + '.text',          warnObj.event || '',        true);
    adapter.setForeignState(channelName + '.headline',      warnObj.headline || '',     true);
    adapter.setForeignState(channelName + '.description',   warnObj.description || '',  true);
    adapter.setForeignState(channelName + '.object',        JSON.stringify(warnObj),    true);
    adapter.log.debug('Add warning "' + channelName + '": ' + tools.formatDate(adapter.formatDate, warnObj.start));
}

function processFile(err, data) {
    if (!data) {
        adapter.log.error('Empty or invalid JSON: ' + err);
        setTimeout(function () {
            adapter.stop();
        });
        return;
    }

    if (data.warnings) {
        var warnings = [];
        for (var w in data.warnings) {
            var arr = data.warnings[w];
            for (var a = 0; a < arr.length; a++) {
                if (arr[a].regionName == adapter.config.region) {
                    warnings.push(arr[a]);
                }
            }
        }
        warnings.sort(tools.sort);

        for (var c = 0; c < channels.length; c++) {
            placeWarning(channels[c], warnings[c]);
        }
    }
    setTimeout(function () {
        adapter.stop();
    });
}


setTimeout(function () {
    adapter.log.info('force terminating after 4 minutes');
    adapter.stop();
}, 240000);
