var adapter = require(__dirname + '/../../lib/adapter.js')({

    name:           'dwd',

    ready: function () {
        ftp.ls('gds/specials/warnings/xml/' + adapter.config.dienststelle, function(err, res) {
            if (err) {
                adapter.log.info('ftp ls error');
                stop();
            } else {
                for (var i = 0; i < res.length; i++) {
                    if (res[i].name.match(new RegExp(adapter.config.kreis + '\.xml$'))) {
                        files.push(res[i].name);
                    }
                }
                getFile(0);
            }
        });
    }

});



setTimeout(stop, 1800000);

var severity = {
        "Minor":    1,
        "Moderate": 2,
        "Severe":   3,
        "Extreme":  4
    };

var JSFtp =         require('jsftp');
var parseString =   require('xml2js').parseString;


function stop() {
    adapter.log.info("terminating");
    setTimeout(function () {
        process.exit();
    }, 250);
}

process.on('SIGINT', function () {
    stop();
});

process.on('SIGTERM', function () {
    stop();
});



adapter.config.kreis = (adapter.config.kreis + 'XXX').slice(0, 4);

var ftp = new JSFtp({
    host: adapter.config.host,
    user: adapter.config.user, // defaults to "anonymous"
    pass: adapter.config.pass // defaults to "@anonymous"
});

var files = [];
var xml = [];



function getFile(i) {
    if (!i) { i = 0; }
    if (!files[i]) {
        received();
        return;
    }
    ftp.get('gds/specials/warnings/xml/' + adapter.config.dienststelle + '/' + files[i], function(err, socket) {
        if (err) {
            adapter.log.error('ftp get error');
            return;
        }
        var str = '';
        socket.on('data', function (d) {
            str += d.toString();
        });

        socket.on('close', function (hadErr) {
            if (hadErr) {
                adapter.log.error('error retrieving file');
                stop();
            } else {
                adapter.log.info('got weather warning');
            }
            xml[i] = str;
            setTimeout(function (c) {
                getFile(c);
            }, 1000, i + 1);
        });
        socket.resume();
    });
}

function received() {
    ftp.raw.quit();

    var warnungen = {};
    var now = formatTimestamp(new Date());

    for (var i = 0; i < xml.length; i++) {
        parseString(xml[i], {explicitArray: false}, function(err, res) {
            //console.log(res.alert.msgType+" "+res.alert.info.eventCode.value+" "+res.alert.info.event+" "+res.alert.info.severity+" "+res.alert.info.effective+" "+res.alert.info.expires);
            var effective = formatTimestamp(res.alert.info.effective),
                expires =   formatTimestamp(res.alert.info.expires);

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
        });

    }
    var warnung = {
        text: '',
        desc: '',
        head: '',
        start: '2037-01-01',
        expires: '0000-00-00',
        severity: 0
    };


    var first = true;
    for (item in warnungen) {
        if (!first) {
            warnung.text += ', ';
            warnung.desc += ' ';
            warnung.head += ', ';
        } else {
            first = false;
        }
        if (warnung.expires < warnungen[item].expires) warnung.expires = warnungen[item].expires;
        warnung.text += warnungen[item].text;
        warnung.desc += warnungen[item].desc;
        warnung.head += warnungen[item].head;

        if (severity[warnungen[item].severity] > warnung.severity) warnung.severity = severity[warnungen[item].severity];

    }

    if (warnung.start === '2037-01-01') warnung.start = '';
    if (warnung.expires === '0000-00-00') warnung.expires = '';

    console.log(warnungen);


    /*
    var firstId = settings.adapters.dwd.firstId;

    socket.emit("setObject", firstId, {
        Name: "DWD Warnung Beginn",
        DPInfo: "",
        TypeName: "VARDP",
    }, function() {
        socket.emit("setState", [firstId, warnung.start || ""]);
    });

    socket.emit("setObject", firstId+1, {
        Name: "DWD Warnung Ende",
        DPInfo: "",
        TypeName: "VARDP",
    }, function() {
        socket.emit("setState", [firstId+1, warnung.expires || ""]);
    });

    socket.emit("setObject", firstId+2, {
        Name: "DWD Warnung Severity",
        DPInfo: "0=None, 1=Minor, 2=Moderate, 3=Severe, 4=Extreme",
        TypeName: "VARDP",
    }, function() {
        socket.emit("setState", [firstId+2, warnung.severity || ""]);
    });

    socket.emit("setObject", firstId+3, {
        Name: "DWD Warnung Text",
        DPInfo: "",
        TypeName: "VARDP",
    }, function() {
        socket.emit("setState", [firstId+3, warnung.text || ""]);
    });

    socket.emit("setObject", firstId+4, {
        Name: "DWD Warnung Headline",
        DPInfo: "",
        TypeName: "VARDP",
    }, function() {
        socket.emit("setState", [firstId+4, warnung.head || ""]);
    });

    socket.emit("setObject", firstId+5, {
        Name: "DWD Warnung Beschreibung",
        DPInfo: "",
        TypeName: "VARDP",
    }, function() {
        socket.emit("setState", [firstId+5, warnung.desc || ""]);
        setTimeout(stop, 10000);
    });
*/
}

function formatTimestamp(str) {
    var ts = new Date(str);
    return ts.getFullYear() + '-' +
        ("0" + (ts.getMonth() + 1).toString(10)).slice(-2) + '-' +
        ("0" + (ts.getDate()).toString(10)).slice(-2) + ' ' +
        ("0" + (ts.getHours()).toString(10)).slice(-2) + ':' +
        ("0" + (ts.getMinutes()).toString(10)).slice(-2) + ':' +
        ("0" + (ts.getSeconds()).toString(10)).slice(-2);
}