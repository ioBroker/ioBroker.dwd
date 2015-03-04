/* jshint -W097 */// jshint strict:false
/*jslint node: true */

// TODO handle FTP timeouts
"use strict";

var JSFtp =       require('jsftp');
var parseString = require('xml2js').parseString;
var utils =       require(__dirname + '/lib/utils'); // Get common adapter utils

var ftp;
var files = [];
var xml = [];

var severity = {
    "Minor":    1,
    "Moderate": 2,
    "Severe":   3,
    "Extreme":  4
};

var adapter = utils.adapter({
    name:           'dwd',
    useFormatDate:  true,
    ready: function () {

        adapter.config.kreis = (adapter.config.kreis + 'XXX').slice(0, 4);

        adapter.config.dienststelle = adapter.config.dienststelle.substring(0, 2);

        adapter.extendObject('warning', {
            type: 'channel',
            role: 'forecast',
            common: {
                name: 'dwd warning ' + adapter.config.dienststelle + ' ' + adapter.config.kreis
            },
            native: {

            }
        });


        ftp = new JSFtp({
            host: adapter.config.host,
            user: adapter.config.user, // defaults to "anonymous"
            pass: adapter.config.pass // defaults to "@anonymous"
        });

        ftp.on('jsftp_debug', function (eventType, data) {
            adapter.log.debug('DEBUG: ', eventType);
            adapter.log.debug(JSON.stringify(data, null, 2));
        });

        ftp.setDebugMode(true);
        adapter.getState('warning.begin', function (err, obj) {
            if (err || !obj) {
                adapter.setState('warning.begin',       {ack: true, val: ''});
                adapter.setState('warning.end',         {ack: true, val: ''});
                adapter.setState('warning.severity',    {ack: true, val: 0});
                adapter.setState('warning.text',        {ack: true, val: 'no data'});
                adapter.setState('warning.headline',    {ack: true, val: 'no data'});
                adapter.setState('warning.description', {ack: true, val: 'no data'});

            }
        });

        ftp.ls('gds/specials/warnings/xml/' + adapter.config.dienststelle, function (err, res) {
            if (err) {
                adapter.log.info('ftp ls error');
                adapter.stop();
            } else {
                for (var i = 0; i < res.length; i++) {
                    if (res[i].name.match(new RegExp(adapter.config.kreis + '.xml$'))) {
                        files.push(res[i].name);
                    }
                }
                getFile(0);
            }
        });
    },

    unload: function (callback) {
        callback();
    }

});

var timeout = null;
function getFile(i) {
    if (!i) i = 0;
    if (!files[i]) {
        received();
        return;
    }
    var str = '';
    var finished = false;

    adapter.log.info('getFile ' + files[i]);

    timeout = setTimeout(function (_i) {
        if (!finished) {
            finished = true;
            xml[i] = str;
            if (!str) adapter.log.error('ftp timeout by ' + 'gds/specials/warnings/xml/' + adapter.config.dienststelle + '/' + files[_i]);
            // Try next time
            setTimeout(function (c) {
                getFile(c);
            }, 1000, _i + 1);
        }
    }, 10000, i);

    ftp.get('gds/specials/warnings/xml/' + adapter.config.dienststelle + '/' + files[i], function (err, socket) {
        if (err) {
            adapter.log.error('ftp get error');
            return;
        }
        socket.on('data', function (d) {
            str += d.toString();
            if (str.indexOf('</alert>') != -1) {
                if (!finished) {
                    finished = true;
                    // bug under windows. Try to detect the end of transmission
                    if (timeout) {
                        clearTimeout(timeout);
                        timeout = 0;
                    }
                    xml[i] = str;
                    setTimeout(function (c) {
                        getFile(c);
                    }, 1000, i + 1);
                }
            }
        });

        socket.on('close', function (hadErr) {
            if (!finished) {
                finished = true;
                if (timeout) {
                    clearTimeout(timeout);
                    timeout = 0;
                }
                if (hadErr) {
                    adapter.log.error('error retrieving file');
                    adapter.stop();
                } else {
                    adapter.log.info('got weather warning');
                }
                xml[i] = str;
                setTimeout(function (c) {
                    getFile(c);
                }, 1000, i + 1);
            }
        });
        socket.on('error', function (err) {
            if (!finished) {
                finished = true;
                if (timeout) {
                    clearTimeout(timeout);
                    timeout = 0;
                }

                adapter.log.error('error retrieving file "' + files[i] + '": ' + err);
                xml[i] = str;
                setTimeout(function (c) {
                    getFile(c);
                }, 1000, i + 1);
            }
        })
        socket.resume();
    });
}

function received() {
    ftp.raw.quit();

    var warnungen = {};
    var now = adapter.formatDate(new Date());

    function parseResult(err, res) {
        adapter.log.debug(res.alert.msgType + ' ' + res.alert.info.eventCode.value + ' ' + res.alert.info.event + ' ' + res.alert.info.severity + ' ' + res.alert.info.effective + ' ' + res.alert.info.expires);
        var effective = adapter.formatDate(new Date(res.alert.info.effective));
        var expires =   adapter.formatDate(new Date(res.alert.info.expires));

        if (res.alert.msgType === 'Alert' && res.alert.info.eventCode.value > 30 && expires > now && effective < now) {
            warnungen[res.alert.info.eventCode.value] = {
                text:       res.alert.info.event,
                desc:       res.alert.info.description,
                head:       res.alert.info.headline,
                start:      effective,
                expires:    expires,
                severity:   res.alert.info.severity
            };
        }

        if (res.alert.msgType === 'Cancel') {
            if (warnungen[res.alert.info.eventCode.value]) {
                delete(warnungen[res.alert.info.eventCode.value]);
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
        start:    '2037-01-01',
        expires:  '0000-00-00',
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

    if (warnung.start   === '2037-01-01') warnung.start = '';
    if (warnung.expires === '0000-00-00') warnung.expires = '';

    adapter.log.debug('warnung', warnung);
    adapter.log.info('setting states');

    adapter.setState('warning.begin',       {ack: true, val: warnung.start});
    adapter.setState('warning.end',         {ack: true, val: warnung.expires});
    adapter.setState('warning.severity',    {ack: true, val: warnung.severity});
    adapter.setState('warning.text',        {ack: true, val: warnung.text});
    adapter.setState('warning.headline',    {ack: true, val: warnung.head});
    adapter.setState('warning.description', {ack: true, val: warnung.desc});

    setTimeout(adapter.stop, 5000);
}

setTimeout(function () {
    adapter.log.info('force terminating after 4 minutes');
    adapter.stop();
}, 240000);

process.on('uncaughtException', function (err) {
    if (err.arguments && err.arguments[0].indexOf('ECONNREFUSED') != -1) {
        adapter.log.warn('Possible DWD service temporary unavailable. Terminating.');
    } else {
        adapter.log.error('Unexpected error: "' + err.toString() + '" Terminating.');
    }
    adapter.stop();
});