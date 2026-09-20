import axios, { type AxiosError } from 'axios';
import { readFileSync, writeFileSync } from 'node:fs';
import { Agent } from 'node:https';
import { join } from 'node:path';

import type { DwdWarning, DwdWarningsFile } from './types';

export type GetFileCallback = (error: string | null, data: DwdWarningsFile | null) => void;

const JSONP_PREFIX = 'warnWetter.loadWarnings(';

/**
 * Parse the body of `warnings.json`.
 *
 * The DWD delivers the file as JSONP (`warnWetter.loadWarnings({...});`), so the wrapper has to be
 * stripped before `JSON.parse`. A body that cannot be parsed is written next to this module as
 * `problem.json` to make it analysable.
 */
function parseBody(body: string, cb: GetFileCallback): void {
    let data: DwdWarningsFile;
    try {
        if (body.startsWith(JSONP_PREFIX)) {
            body = body.substring(JSONP_PREFIX.length);
            while (body[body.length - 1] !== '}') {
                body = body.substring(0, body.length - 1);
            }
        }
        data = JSON.parse(body);
    } catch (e) {
        try {
            writeFileSync(join(__dirname, 'problem.json'), body);
        } catch {
            // ignore
        }
        return cb(`Cannot parse JSON file: ${e}`, null);
    }
    cb(null, data);
}

/**
 * Read the warnings from an URL or - for the tests - from a local file.
 *
 * @param url http(s) URL or a path to a local file
 * @param cb called with the parsed file or an error text
 * @param retries how often a failed HTTP request is repeated, 3 by default
 */
export function getFile(url: string, cb: GetFileCallback, retries?: number): void {
    if (retries === undefined) {
        retries = 3;
    }

    if (!url.match(/^http:\/\/|^https:\/\//)) {
        parseBody(readFileSync(url).toString(), cb);
        return;
    }

    // maxCachedSessions: 0 verhindert TLS Session Resumption (EPROTO-Fix)
    const agent = new Agent({
        rejectUnauthorized: false,
        maxCachedSessions: 0,
    });

    const attempt = (remaining: number): void => {
        axios
            // `responseType: 'text'` keeps axios from parsing the body: it is JSONP, not JSON,
            // and `parseBody` has to strip the wrapper first.
            .get<string>(url, {
                httpsAgent: agent,
                timeout: 15000,
                responseType: 'text',
                headers: { 'User-Agent': 'Mozilla/5.0 ioBroker DWD Adapter' },
            })
            .then(response => {
                if (response.status === 200) {
                    parseBody(response.data, cb);
                } else if (remaining > 0) {
                    setTimeout(() => attempt(remaining - 1), 2000);
                } else {
                    cb(`Cannot read JSON file: HTTP ${response.status}`, null);
                }
            })
            .catch((error: AxiosError) => {
                if (remaining > 0) {
                    const delay = error.code === 'EPROTO' || error.code === 'ECONNRESET' ? 3000 : 2000;
                    setTimeout(() => attempt(remaining - 1), delay);
                } else {
                    cb(`Cannot read JSON file: ${error}`, null);
                }
            });
    };

    attempt(retries);
}

/**
 * Order the warnings of one region: highest level first, then earliest start, then longest
 * duration, then type. Empty entries are sorted to the end.
 */
export function sort(a?: DwdWarning, b?: DwdWarning): number {
    if (a && !b) {
        return 1;
    }
    if (b && !a) {
        return -1;
    }
    if (!a || !b) {
        return 0;
    }

    // Sorted by highest level (severity)
    if (a.level > b.level) {
        return -1;
    }
    if (b.level > a.level) {
        return 1;
    }

    // Sorted by earliest start (first occurrence)
    if (a.start > b.start) {
        return 1;
    }
    if (b.start > a.start) {
        return -1;
    }

    // Sorted by latest end (longest occurrence)
    if ((a.end ?? 0) > (b.end ?? 0)) {
        return -1;
    }
    if ((b.end ?? 0) > (a.end ?? 0)) {
        return 1;
    }

    // Sorted by type
    if (a.type > b.type) {
        return 1;
    }
    if (b.type > a.type) {
        return -1;
    }

    return 0;
}
