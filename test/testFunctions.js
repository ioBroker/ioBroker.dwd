var expect  = require('chai').expect;
var setup   = require(__dirname + '/lib/setup');
var request = require('request');
var tools   = require(__dirname + '/../lib/tools');

var objects = null;
var states  = null;
var onStateChanged = null;
var onObjectChanged = null;

function checkConnectionOfAdapter(cb, counter) {
    counter = counter || 0;
    if (counter > 20) {
        cb && cb('Cannot check connection');
        return;
    }

    states.getState('system.adapter.dwd.0.alive', function (err, state) {
        if (err) console.error(err);
        if (state && state.val) {
            cb && cb();
        } else {
            setTimeout(function () {
                checkConnectionOfAdapter(cb, counter + 1);
            }, 1000);
        }
    });
}

function checkValueOfState(id, value, cb, counter) {
    counter = counter || 0;
    if (counter > 20) {
        cb && cb('Cannot check value Of State ' + id);
        return;
    }

    states.getState(id, function (err, state) {
        if (err) console.error(err);
        if (value === null && !state) {
            cb && cb();
        } else
        if (state && (value === undefined || state.val === value)) {
            cb && cb();
        } else {
            setTimeout(function () {
                checkValueOfState(id, value, cb, counter + 1);
            }, 500);
        }
    });
}

function getFile(cb) {
    var url = 'http://www.dwd.de/DWD/warnungen/warnapp/json/warnings.json';
    tools.getFile(url, function (err, data) {
        if (err || !data || !data.warnings || !data.warnings.length) {
            url = __dirname + '/lib/warnings.json';
            tools.getFile(url, function (err, data) {
                cb && cb(url, data);
            });
        } else {
            cb && cb(url, data);
        }
    })
}
var warnings = [];

describe('Test DWD', function() {
    before('Test DWD: Start js-controller', function (_done) {
        this.timeout(600000); // because of first install from npm

        getFile(function (url, data) {
            // find first object with warning
            for (var w in data.warnings) {
                var arr = data.warnings[w];
                for (var a = 0; a < arr.length; a++) {
                    warnings.push(arr[a]);
                }
            }

            warnings.sort(tools.sort);

            console.log('Warnings: ' + JSON.stringify(warnings));
            console.log('Use: ' + warnings[0].regionName);

            setup.setupController(function () {
                var config = setup.getAdapterConfig();
                // enable adapter
                config.common.enabled  = true;
                config.common.loglevel = 'debug';

                config.native.url      = url;
                config.native.warnings = "3";
                config.native.region   = warnings[0].regionName;

                setup.setAdapterConfig(config.common, config.native);

                setup.startController(true, function (id, obj) {
                        onObjectChanged && onObjectChanged(id, obj);
                    }, function (id, state) {
                        console.log(id + ': ' + (state ? state.val : 'null'));
                        onStateChanged && onStateChanged(id, state);
                    },
                    function (_objects, _states) {
                        objects = _objects;
                        states  = _states;
                        states.subscribe('*');
                        objects.subscribe('*');
                        _done();
                    });
            });
        });
    });

    it('Test DWD: Check if adapter started', function (done) {
        this.timeout(10000);
        checkConnectionOfAdapter(done);
    });

    it('Test DWD: check created objects', function (done) {
        this.timeout(2000);
        setTimeout(function () {
            objects.getObject('dwd.0.warning2.begin', function (err, obj) {
                expect(err).to.be.not.ok;
                expect(obj).to.be.ok;
                expect(obj._id).to.be.equal('dwd.0.warning2.begin');
                done();
            });
        }, 1000);
    });

    it('Test DWD: check warning', function (done) {
        this.timeout(10000);

        setTimeout(function () {
            states.getState('dwd.0.warning.begin', function (err, state) {
                expect(err).to.be.not.ok;
                expect(state).to.be.ok;
                expect(state.val).to.be.ok;
                states.getState('dwd.0.warning.end', function (err, state) {
                    expect(err).to.be.not.ok;
                    expect(state).to.be.ok;

                    // some warnings does not have end
                    //expect(state.val).to.be.ok;

                    states.getState('dwd.0.warning.severity', function (err, state) {
                        expect(err).to.be.not.ok;
                        expect(state).to.be.ok;
                        console.log('Level: ' + state.val);
                        expect(state.val).to.be.equal(warnings[0].level - 1);
                        done();
                    });
                });
            });
        }, 5000);
    });

    after('Test DWD: Stop js-controller', function (done) {
        this.timeout(6000);

        setup.stopController(function (normalTerminated) {
            console.log('Adapter normal terminated: ' + normalTerminated);
            done();
        });
    });
});
