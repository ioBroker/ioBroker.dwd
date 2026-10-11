'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const { tests } = require('@iobroker/testing');

// Run tests
// Note: the adapter runs in "schedule" mode - it reads the warnings once and terminates itself.
// `terminate()` ends the process with 11 (ADAPTER_REQUESTED_TERMINATION), which is a regular end here.
const allowedExitCodes = [0, 11];

// The fixture is read from disk instead of the DWD server: `native.url` accepts a local path.
const fixturePath = path.join(__dirname, 'fixtures', 'warnings.json');
const fixture = require('./fixtures/warnings.json');
// the order the adapter uses - the tests run against the compiled adapter anyway
const { sort } = require('../build/lib/tools');
const all = Object.values(fixture.warnings).flat();
const region = [...all].sort(sort)[0].regionName;
const regionWarnings = all
    .filter(w => w.regionName === region)
    .filter((w, i, list) => list.findIndex(o => JSON.stringify(o) === JSON.stringify(w)) === i)
    .sort(sort);

async function waitForTermination(harness) {
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
        if (harness.didAdapterStop()) {
            assert.ok(allowedExitCodes.includes(harness.adapterExit), `Adapter exited with ${harness.adapterExit}`);
            return;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('Adapter did not terminate within 30 seconds');
}

tests.integration(path.join(__dirname, '..'), {
    allowedExitCodes,
    defineAdditionalTests({ suite }) {
        // Idea and first version of these checks: PR #306 by BeSiRe1
        suite('Warnings of a region from a local file', getHarness => {
            let harness;

            before(async function () {
                this.timeout(60000);
                harness = getHarness();
                await harness.changeAdapterConfig('dwd', {
                    native: { url: fixturePath, region, warnings: 3, warncellId: '', rainRadar: false },
                });
                await harness.startAdapter();
                await waitForTermination(harness);
            });

            it('names the channels warning, warning1, warning2 - there is no warning0', async () => {
                for (const channel of ['warning', 'warning1', 'warning2']) {
                    assert.ok(await harness.objects.getObjectAsync(`dwd.0.${channel}.begin`), `${channel} missing`);
                }
                assert.equal(await harness.objects.getObjectAsync('dwd.0.warning0'), null);
                assert.equal(await harness.objects.getObjectAsync('dwd.0.warning3'), null);
            });

            it('writes the most severe warning into the first channel', async () => {
                const expected = regionWarnings[0];
                const values = {
                    begin: expected.start,
                    end: expected.end || null,
                    level: expected.level,
                    severity: expected.level - 1,
                    text: expected.event,
                    headline: expected.headline,
                };
                for (const [state, value] of Object.entries(values)) {
                    const st = await harness.states.getStateAsync(`dwd.0.warning.${state}`);
                    assert.ok(st, `warning.${state} missing`);
                    assert.equal(st.val, value, `warning.${state}`);
                    assert.equal(st.ack, true);
                }
                const count = await harness.states.getStateAsync('dwd.0.numberOfWarnings');
                assert.equal(count.val, regionWarnings.length);
            });

            it('empties the channels without a warning', async () => {
                // the fixture has two warnings for this region, the third channel stays empty
                assert.equal(regionWarnings.length, 2);
                const headline = await harness.states.getStateAsync('dwd.0.warning2.headline');
                assert.equal(headline.val, '');
                const severity = await harness.states.getStateAsync('dwd.0.warning2.severity');
                assert.equal(severity.val, 0);
            });

            it('creates no warncell objects without a warncell ID', async () => {
                assert.equal(await harness.objects.getObjectAsync('dwd.0.warncell'), null);
                assert.equal(await harness.objects.getObjectAsync('dwd.0.warncell.numberOfWarnings'), null);
            });

            it('sets info.lastUpdate', async () => {
                const st = await harness.states.getStateAsync('dwd.0.info.lastUpdate');
                assert.ok(st && st.val > 0);
            });
        });
    },
});
