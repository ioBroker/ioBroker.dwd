'use strict';
const request = require('request');

function formatDate(adapterFormatDate, date) {
    if (!date) return date || '';
	if (typeof date !== 'object') {
		date = new Date(date);
	}
    let h = date.getHours();
    let m = date.getMinutes();

    if (h < 10) h = '0' + h.toString();
    if (m < 10) m = '0' + m.toString();

    return adapterFormatDate(date) + ' ' + h + ':' + m;
}

function _getFile(body, cb) {
	let data;
	try {
		if (body.startsWith('warnWetter.loadWarnings(')) {
			body = body.substring('warnWetter.loadWarnings('.length);
			while (body[body.length - 1] !== '}') {
				body = body.substring(0, body.length - 1);
			}
		}
		data = JSON.parse(body);
	} catch (e) {
		try {
			require('fs').writeFileSync(__dirname + '/problem.json', body);
		} catch (err) {
			// ignore
		}
		return cb('Cannot parse JSON file: ' + e, null);
	}
	cb(null, data);
}

function getFile(url, cb) {
    if (!url.match(/^http:\/\/|^https:\/\//)) {
        _getFile(require('fs').readFileSync(url).toString(), cb);
    } else {
		request({
			method: 'GET',
            rejectUnauthorized: false,
            url
		}, (error, response, body) => {
			if (!error && response.statusCode === 200) {
				_getFile(body, cb);
			} else {
				cb('Cannot read JSON file: ' + error || response.statusCode);
			}
		});
	}
}

function sort(a, b) {
	if (a && !b)  			return 1;
	if (b && !a)  			return -1;
	if (!a && !b) 			return 0;

	// Sorted by highest level (severity)
	if (a.level > b.level) 	return -1;
	if (b.level > a.level) 	return 1;

	// Sorted by earliest start (first occurrence)
	if (a.start > b.start) 	return 1;
	if (b.start > a.start) 	return -1;

	// Sorted by latest end (longest occurrence)
	if (a.end > b.end) 		return -1;
	if (b.end > a.end) 		return 1;

	// Sorted by type
	if (a.type > b.type) 	return 1;
	if (b.type > a.type) 	return -1;

	return 0;
}


module.exports.getFile    = getFile;
module.exports.formatDate = formatDate;
module.exports.sort       = sort;
