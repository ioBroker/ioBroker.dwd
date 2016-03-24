/* jshint -W097 */// jshint strict:false
/*jslint node: true */

"use strict";

var utils   = require(__dirname + '/lib/utils'); // Get common adapter utils
var tools   = require(__dirname + '/lib/tools');

/*var severity = [
    '',
    'Minor',
    'Moderate',
    'Severe',
    'Extreme'
];*/

var channels = [];
var iopkg;

var adapter = utils.adapter({
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

    /*adapter.getState('warning.begin', function (err, obj) {
     if (err || !obj) {
     adapter.setState('warning.begin',       {ack: true, val: ''});
     adapter.setState('warning.end',         {ack: true, val: ''});
     adapter.setState('warning.severity',    {ack: true, val: 0});
     adapter.setState('warning.text',        {ack: true, val: 'no data'});
     adapter.setState('warning.headline',    {ack: true, val: 'no data'});
     adapter.setState('warning.description', {ack: true, val: 'no data'});
     }
     });

     ftp.ls('gds/specials/alerts/cap/' + adapter.config.dienststelle, function (err, res) {
     if (err) {
     adapter.log.error('ftp ls error');
     adapter.stop();
     } else {
     for (var i = 0; i < res.length; i++) {
     adapter.log.debug(res[i].name);
     if (adapter.config.kreisReg.test(res[i].name))  {
     files.push(res[i].name);
     }
     }
     getFile(0);
     }
     });*/
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
    //{
    //    "stateShort" : "RP",
    //    "regionName" : "Kreis und Stadt Kaiserslautern",
    //    "description" : "Es tritt im Warnzeitraum leichter Schneefall mit Mengen zwischen 1 cm und 5 cm auf. Verbreitet wird es glatt.",
    //    "end" : 1457002800000,
    //    "start" : 1456986960000,
    //    "headline" : "Amtliche WARNUNG vor LEICHTEM SCHNEEFALL",
    //    "event" : "LEICHTER SCHNEEFALL",
    //    "instruction" : "",
    //    "altitudeStart" : null,
    //    "altitudeEnd" : null,
    //    "type" : 3,
    //    "level" : 2,
    //    "state" : "Rheinland-Pfalz"
    //}
    adapter.setForeignState(channelName + '.begin',         tools.formatDate(adapter.formatDate, warnObj.start),  true);
    adapter.setForeignState(channelName + '.end',           tools.formatDate(adapter.formatDate, warnObj.end),    true);
    adapter.setForeignState(channelName + '.severity',      warnObj.level > 1 ? warnObj.level - 1 : 0,            true);
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

/*
function received() {
    ftp.raw.quit();

    var warnungen = {};
    var now = new Date();

    function parseResult(err, res) {
        adapter.log.debug(res.alert.msgType + ' ' + res.alert.info.eventCode[2].value + ' ' + res.alert.info.event + ' ' + res.alert.info.severity + ' ' + res.alert.info.effective + ' ' + res.alert.info.expires);
        var effective = new Date(res.alert.info.effective);
        var expires =   new Date(res.alert.info.expires);

        if (res.alert.msgType === 'Alert' && parseInt(res.alert.info.eventCode[2].value, 10) > 30 && expires > now && effective < now) {
            adapter.log.debug('Found: ' + res.alert.msgType + ' from ' + effective + ' to ' + expires + '. Event: ' + res.alert.info.event + ', ' + res.alert.info.description);
            warnungen[res.alert.info.eventCode[2].value] = {
                text:       res.alert.info.event,
                desc:       res.alert.info.description + (res.alert.info.instruction ? '<br>' + res.alert.info.instruction : ''),
                head:       res.alert.info.headline,
                start:      effective,
                expires:    expires,
                severity:   res.alert.info.severity
            };
        } else {
            adapter.log.debug('Ignored: ' + res.alert.msgType + ' from ' + effective + ' to ' + expires + '. Event: ' + res.alert.info.event + ', ' + res.alert.info.description);
        }

        if (res.alert.msgType === 'Cancel') {
            if (warnungen[res.alert.info.eventCode[2].value]) {
                delete(warnungen[res.alert.info.eventCode[2].value]);
            }
        }
    }

    for (var i = 0; i < xml.length; i++) {
        parseString(xml[i], {explicitArray: false}, parseResult);

    }
    var warnung = {
        text:     '',
        desc:     '',
        head:     '',
        start:    new Date('2037-01-01'),
        expires:  new Date('1970-01-01'),
        severity: 0
    };

    var first = true;
    for (var item in warnungen) {
        if (!first) {
            warnung.text += ', ';
            warnung.desc += ' ';
            warnung.head += ', ';
        } else {
            first = false;
        }
        if (warnung.expires < warnungen[item].expires)  warnung.expires =   warnungen[item].expires;
        if (warnung.start > warnungen[item].start)      warnung.start =     warnungen[item].start;
        warnung.text += warnungen[item].text;
        warnung.desc += warnungen[item].desc;
        warnung.head += warnungen[item].head;

        if (severity[warnungen[item].severity] > warnung.severity) warnung.severity = severity[warnungen[item].severity];

    }

    if (warnung.start.getFullYear()   === 2037) warnung.start   = '';
    if (warnung.expires.getFullYear() === 1970) warnung.expires = '';

    adapter.log.debug('warnung', warnung);
    adapter.log.info('setting states');

    adapter.setState('warning.begin',       {ack: true, val: formatDate(warnung.start)});
    adapter.setState('warning.end',         {ack: true, val: formatDate(warnung.expires)});
    adapter.setState('warning.severity',    {ack: true, val: warnung.severity});
    adapter.setState('warning.text',        {ack: true, val: warnung.text});
    adapter.setState('warning.headline',    {ack: true, val: warnung.head});
    adapter.setState('warning.description', {ack: true, val: warnung.desc});

    setTimeout(adapter.stop, 5000);
}
*/
setTimeout(function () {
    adapter.log.info('force terminating after 4 minutes');
    adapter.stop();
}, 240000);
