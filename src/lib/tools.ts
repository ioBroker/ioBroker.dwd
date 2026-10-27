import axios, { type AxiosError } from 'axios';
import { readFileSync, writeFileSync } from 'node:fs';
import { Agent } from 'node:https';
import { join } from 'node:path';

import type { DwdWarning, DwdWarningsFile } from './types';

export type GetFileCallback<T = DwdWarningsFile> = (error: string | null, data: T | null) => void;

const JSONP_PREFIX = 'warnWetter.loadWarnings(';

/**
 * Parse the body of `warnings.json` or of a geoserver answer.
 *
 * The DWD delivers `warnings.json` as JSONP (`warnWetter.loadWarnings({...});`), so the wrapper has to
 * be stripped before `JSON.parse`. Plain JSON - the geoserver - is parsed as it is. A body that cannot
 * be parsed is written next to this module as `problem.json` to make it analysable.
 */
function parseBody<T>(body: string, cb: GetFileCallback<T>): void {
    let data: T;
    try {
        // Everything up to the last `}`. A truncated body without one ends up empty and JSON.parse throws.
        const json = body.startsWith(JSONP_PREFIX) ? body.slice(JSONP_PREFIX.length, body.lastIndexOf('}') + 1) : body;
        data = JSON.parse(json);
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
 * Read a JSON(P) file from an URL or - for the tests - from a local file.
 *
 * @param url http(s) URL or a path to a local file
 * @param cb called with the parsed file or an error text
 * @param retries how often a failed HTTP request is repeated, 3 by default
 */
export function getFile<T = DwdWarningsFile>(url: string, cb: GetFileCallback<T>, retries?: number): void {
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

/** `getFile()` as a promise. Never rejects, the error text is returned instead. */
export function getFileAsync<T>(url: string, retries?: number): Promise<{ error: string | null; data: T | null }> {
    return new Promise(resolve => getFile<T>(url, (error, data) => resolve({ error, data }), retries));
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
