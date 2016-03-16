function formatDate(adapterFormatDate, date) {
    if (!date) return date;
    var h = date.getHours();
    var m = date.getMinutes();

    if (h < 10) h = '0' + h.toString();
    if (m < 10) m = '0' + m.toString();

    return adapterFormatDate(date) + ' ' + h + ':' + m;
}

function _getFile(body, cb) {
	try {
		if (body.substring(0, 'warnWetter.loadWarnings('.length) == 'warnWetter.loadWarnings(') {
			body = body.substring('warnWetter.loadWarnings('.length);
			while (body[body.length - 1] !== '}') {
				body = body.substring(0, body.length - 1);
			}
		}
		cb(null, JSON.parse(body));
	} catch (e) {
		require('fs').writeFileSync(__dirname + '/problem.json', body);
		cb('Cannot parse JSON file.');
	}	
}

function getFile(url, cb) {
    if (url.match(/^http:\/\/|^https:\/\/) {   
        _getFile(require('fs').readFileSync(url).toString(), cb);
    } else {
		request(url, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				_getFile(body, cb);
			} else {
				cb('Cannot read JSON file: ' + error || response.statusCode);
			}
		});
	}
}

module.exports.getFile    = getFile;
module.exports.formatDate = formatDate;