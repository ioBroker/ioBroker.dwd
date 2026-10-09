'use strict';
const axios = require('axios');
const fs = require('node:fs');
const https = require('node:https');

/**
 *
 * @param adapterFormatDate
 * @param date
 */
function formatDate(adapterFormatDate, date) {
    if (!date) {
        return date || '';
    }
    if (typeof date !== 'object') {
        date = new Date(date);
    }
    let h = date.getHours();
    let m = date.getMinutes();

    if (h < 10) {
h = `0${  h.toString()}`;
}
    if (m < 10) {
m = `0${  m.toString()}`;
}

    return `${adapterFormatDate(date)  } ${  h  }:${  m}`;
}

function _getFile(body, cb) {
    let data;
    if (body && typeof body === 'object') {
        return cb(null, body);
    }
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
            fs.writeFileSync(`${__dirname  }/problem.json`, body);
        } catch (err) {
            // ignore
        }
        return cb(`Cannot parse JSON file: ${  e}`, null);
    }
    cb(null, data);
}

/**
 *
 * @param url
 * @param cb
 * @param retries
 */
function getFile(url, cb, retries) {
    if (retries === undefined) {
retries = 3;
}

    if (!url.match(/^http:\/\/|^https:\/\//)) {
        _getFile(fs.readFileSync(url).toString(), cb);
    } else {
        // maxCachedSessions: 0 verhindert TLS Session Resumption (EPROTO-Fix)
        const agent = new https.Agent({
            rejectUnauthorized: false,
            maxCachedSessions: 0
        });

        const attempt = (remaining) => {
            axios.get(url, {
                httpsAgent: agent,
                timeout: 15000,
                headers: { 'User-Agent': 'Mozilla/5.0 ioBroker DWD Adapter' }
            })
                .then(response => {
                    if (response.status === 200) {
                        _getFile(response.data, cb);
                    } else {
                        if (remaining > 0) {
                            setTimeout(() => attempt(remaining - 1), 2000);
                        } else {
                            cb(`Cannot read JSON file: HTTP ${  response.status}`, null);
                        }
                    }
                })
                .catch(error => {
                    if (remaining > 0) {
                        const delay = (error.code === 'EPROTO' || error.code === 'ECONNRESET') ? 3000 : 2000;
                        setTimeout(() => attempt(remaining - 1), delay);
                    } else {
                        cb(`Cannot read JSON file: ${  error}`, null);
                    }
                });
        };

        attempt(retries);
    }
}

/**
 *
 * @param a
 * @param b
 */
function sort(a, b) {
    if (a && !b)  			{
return 1;
}
    if (b && !a)  			{
return -1;
}
    if (!a && !b) 			{
return 0;
}

    // Sorted by highest level (severity)
    if (a.level > b.level) 	{
return -1;
}
    if (b.level > a.level) 	{
return 1;
}

    // Sorted by earliest start (first occurrence)
    if (a.start > b.start) 	{
return 1;
}
    if (b.start > a.start) 	{
return -1;
}

    // Sorted by latest end (longest occurrence)
    if (a.end > b.end) 		{
return -1;
}
    if (b.end > a.end) 		{
return 1;
}

    // Sorted by type
    if (a.type > b.type) 	{
return 1;
}
    if (b.type > a.type) 	{
return -1;
}

    return 0;
}


module.exports.getFile    = getFile;
module.exports.formatDate = formatDate;
module.exports.sort       = sort;
