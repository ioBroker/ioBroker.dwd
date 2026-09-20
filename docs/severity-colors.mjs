// Renders docs/img/severity-colors.svg from the real colour table in src-widgets/src/severity.ts,
// so the documentation cannot drift away from the code.
import { readFileSync, writeFileSync } from 'node:fs';

const source = readFileSync('src-widgets/src/severity.ts', 'utf8');
const block = source.slice(
    source.indexOf('const SEVERITY_COLORS'),
    source.indexOf('};', source.indexOf('const SEVERITY_COLORS')),
);

const colors = {};
for (const m of block.matchAll(/(\d+):\s*'(#[0-9a-fA-F]{3,6})'/g)) {
    colors[Number(m[1])] = m[2];
}

const MEANING = {
    0: ['None', 'no colour'],
    1: ['Minor', 'Wetterwarnung'],
    2: ['Moderate', 'markantes Wetter'],
    3: ['Severe', 'Unwetter'],
    4: ['Extreme', 'extremes Unwetter'],
    9: ['Heat Warning', 'Hitzewarnung'],
    11: ['No Warning', 'keine Warnung'],
    19: ['UV Warning', 'UV-Warnung'],
    49: ['Strong Heat', 'starke Hitze'],
    50: ['Extreme Heat', 'extreme Hitze'],
};

/** Same rule as textColorOn() in severity.ts - ITU-R BT.601 luma */
function textColorOn(background) {
    let hex = background.substring(1);
    if (hex.length === 3) {
        hex = hex
            .split('')
            .map(c => c + c)
            .join('');
    }
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 140 ? '#000000' : '#ffffff';
}

const rows = Object.keys(MEANING)
    .map(Number)
    .sort((a, b) => a - b);

const ROW_H = 34;
const PAD = 16;
const SWATCH_W = 210;
const W = 620;
const H = PAD * 2 + 26 + rows.length * ROW_H;

const parts = [];
parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Severity colours of the DWD widgets">`,
);
parts.push(`<style>
    .bg { fill: #ffffff; }
    .frame { stroke: #d0d7de; }
    .head { fill: #57606a; font: 600 12px system-ui, sans-serif; letter-spacing: .04em; }
    .val  { fill: #24292f; font: 600 13px ui-monospace, SFMono-Regular, Menlo, monospace; }
    .txt  { fill: #24292f; font: 13px system-ui, sans-serif; }
    .hex  { font: 12px ui-monospace, SFMono-Regular, Menlo, monospace; }
</style>`);
parts.push(`<rect class="bg frame" x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="8"/>`);

parts.push(`<text class="head" x="${PAD}" y="${PAD + 14}">SEVERITY</text>`);
parts.push(`<text class="head" x="${PAD + 74}" y="${PAD + 14}">COLOUR AND TEXT</text>`);
parts.push(`<text class="head" x="${PAD + 74 + SWATCH_W + 16}" y="${PAD + 14}">MEANING</text>`);

rows.forEach((severity, i) => {
    const y = PAD + 26 + i * ROW_H;
    const color = colors[severity] || '';
    const [label, meaning] = MEANING[severity];

    parts.push(`<text class="val" x="${PAD}" y="${y + 21}">${severity}</text>`);

    if (color) {
        const fg = textColorOn(color);
        parts.push(
            `<rect x="${PAD + 74}" y="${y + 4}" width="${SWATCH_W}" height="${ROW_H - 10}" rx="4" fill="${color}"/>`,
        );
        parts.push(
            `<text class="hex" x="${PAD + 84}" y="${y + 21}" fill="${fg}">${color}  ${label}</text>`,
        );
    } else {
        parts.push(
            `<rect class="frame" x="${PAD + 74}.5" y="${y + 4}.5" width="${SWATCH_W - 1}" height="${ROW_H - 11}" rx="4" fill="none" stroke-dasharray="3 3"/>`,
        );
        parts.push(`<text class="txt" x="${PAD + 84}" y="${y + 21}" opacity="0.6">transparent</text>`);
    }

    parts.push(`<text class="txt" x="${PAD + 74 + SWATCH_W + 16}" y="${y + 21}">${meaning}</text>`);
});

parts.push('</svg>');
writeFileSync('docs/img/severity-colors.svg', `${parts.join('\n')}\n`);
console.log(`docs/img/severity-colors.svg written, ${rows.length} rows, colours from severity.ts`);
