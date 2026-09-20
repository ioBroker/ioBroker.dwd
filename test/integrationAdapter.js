'use strict';

const path = require('node:path');
const { tests } = require('@iobroker/testing');

// Run tests
// Note: the adapter runs in "schedule" mode - it reads the warnings once and terminates itself.
tests.integration(path.join(__dirname, '..'));
