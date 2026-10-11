// ============================================================
// [BLOCK:000] Systemkopf
// ============================================================

// ************************************************************
// DWD Integrationstest
//
// Prüft Adapterstart, Warnungsordner und Warnwerte mit ioBroker.
//
// Version: 0.1 (11.10.2026)
//
// ************************************************************
// ============================================================

// ============================================================
// BLOCK-NAVIGATION (STRG+F → BLOCK:XYZ)
// ============================================================
// [BLOCK:000] Systemkopf
// [BLOCK:100] Module
// [BLOCK:200] Testdaten
// [BLOCK:300] Auf Verarbeitung warten
// [BLOCK:400] Integrationsprüfung
// [BLOCK:1000] Änderungsverlauf
// ============================================================

// ============================================================
// [BLOCK:100] Module
// ============================================================
'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const { tests } = require('@iobroker/testing');
const tools = require('../lib/tools');
const allowedExitCodes = [0, 11];
// ============================================================

// ============================================================
// [BLOCK:200] Testdaten
// ============================================================
const fixturePath = path.join(__dirname, 'lib', 'warnings.json');
const fixture = require('./lib/warnings.json');
const firstWarning = Object.values(fixture.warnings).flat().sort(tools.sort)[0];
const regionWarnings = Object.values(fixture.warnings)
    .flat()
    .filter(warning => warning.regionName === firstWarning.regionName)
    .filter((warning, index, warnings) =>
        warnings.findIndex(candidate => JSON.stringify(candidate) === JSON.stringify(warning)) === index
    )
    .sort(tools.sort);
// ============================================================

// ============================================================
// [BLOCK:300] Auf Verarbeitung warten
// ============================================================
async function waitForProcessing(harness) {
    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
        const state = await harness.states.getStateAsync('dwd.0.info.lastUpdate');
        if (state && state.val > 0 && harness.didAdapterStop()) {
            assert.ok(allowedExitCodes.includes(harness.adapterExit));
            return;
        }
        if (harness.didAdapterStop() && !allowedExitCodes.includes(harness.adapterExit)) {
            throw new Error(`Adapter exited with ${harness.adapterExit}`);
        }
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    throw new Error('Adapter did not finish processing the warning fixture within 20 seconds');
}
// ============================================================

// ============================================================
// [BLOCK:400] Integrationsprüfung
// ============================================================
tests.integration(path.join(__dirname, '..'), {
    allowedExitCodes,
    defineAdditionalTests({ suite }) {
        suite('DWD warning fixture', getHarness => {
            let harness;

            before(async function () {
                this.timeout(30000);
                harness = getHarness();
                await harness.changeAdapterConfig('dwd', {
                    native: {
                        url: fixturePath,
                        region: firstWarning.regionName,
                        warnings: 3,
                        warncellId: '',
                        rainRadar: false
                    }
                });
                await harness.startAdapter();
                await waitForProcessing(harness);
            });

            it('creates the configured warning channels', async () => {
                const object = await harness.objects.getObjectAsync('dwd.0.warning2.begin');
                assert.ok(object);
                assert.equal(object._id, 'dwd.0.warning2.begin');
                assert.equal(object.type, 'state');
            });

            it('writes the first regional warning and warning count', async () => {
                const expected = regionWarnings[0];
                for (const [property, value] of Object.entries({
                    begin: expected.start,
                    end: expected.end || null,
                    severity: expected.level - 1,
                    text: expected.event,
                    object: JSON.stringify(expected)
                })) {
                    const state = await harness.states.getStateAsync(`dwd.0.warning.${property}`);
                    assert.ok(state, `Missing warning.${property}`);
                    assert.equal(state.val, value, `Unexpected warning.${property}`);
                    assert.equal(state.ack, true);
                }
                const count = await harness.states.getStateAsync('dwd.0.numberOfWarnings');
                assert.equal(count.val, regionWarnings.length);
            });

            it('creates the same configured count for warning cells', async () => {
                for (const channel of ['warning', 'warning1', 'warning2']) {
                    const object = await harness.objects.getObjectAsync(`dwd.0.warncell.${channel}.begin`);
                    assert.ok(object, `Missing warncell.${channel}.begin`);
                }
                assert.ok(!(await harness.objects.getObjectAsync('dwd.0.warncell.warning3')));
                assert.ok(!(await harness.objects.getObjectAsync('dwd.0.warncell.lastUpdate')));
                assert.ok(!(await harness.objects.getObjectAsync('dwd.0.warncell.warnings')));
                const count = await harness.states.getStateAsync('dwd.0.warncell.numberOfWarnings');
                assert.equal(count.val, 0);
                const text = await harness.states.getStateAsync('dwd.0.warncell.warning.text');
                assert.equal(text.val, '');
            });
        });
    }
});
// ============================================================

// ============================================================
// [BLOCK:1000] Änderungsverlauf
// ============================================================
// 0.1 (11.10.2026):
// - Reguläres Adapterende mit ioBroker-Code 11 als erfolgreichen Abschluss berücksichtigt.
// - Integrationstest mit aktuellem ioBroker-Testmodul und festen Warndaten erstellt.
//
// ============================================================
