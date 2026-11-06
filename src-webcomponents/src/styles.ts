/**
 * The styles of the shadow root. The element fills the box of the host; it has a transparent background and
 * inherits `color` and `font`, so it follows the theme of the host. The sizes follow the box through container
 * units: `cqmin` for the full layout, `cqh` for the one line of the compact one.
 *
 * The severity colours are the meaning of the warning and stay the same in both themes; the text on them is black
 * or white (`textColorOn`), everything else takes the theme variables of the host (`--iob-*`).
 */
export const STYLES = `
:host {
    display: block;
    width: 100%;
    height: 100%;
}
.mount {
    width: 100%;
    height: 100%;
    /* the size of the box does not depend on what is in it - no loop between measuring and laying out */
    container-type: size;
}
.box {
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: clamp(2px, 4cqmin, 8px);
    overflow: hidden;
    font-size: clamp(11px, 15cqmin, 16px);
    line-height: 1.3;
    -webkit-tap-highlight-color: transparent;
}
.box.edit {
    pointer-events: none;
}
.title {
    flex: none;
    font-weight: 600;
    font-size: 0.85em;
    color: var(--iob-text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.band {
    flex: 1 1 auto;
    min-height: 0;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 0.2em;
    padding: clamp(3px, 6cqmin, 10px) clamp(4px, 8cqmin, 14px);
    border-radius: calc(var(--iob-border-radius) * 2);
    overflow: hidden;
    outline: none;
}
.band.plain {
    border: 1px solid var(--iob-divider);
}
.band.clickable {
    cursor: pointer;
}
.band.clickable:focus-visible {
    box-shadow:
        0 0 0 2px var(--iob-paper),
        0 0 0 4px var(--iob-primary);
}
.head {
    flex: none;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    column-gap: 0.75em;
    min-width: 0;
}
.headline {
    /* as wide as its text: the period goes below it before the headline is cut */
    flex: 1 1 auto;
    min-width: 0;
    font-weight: 700;
    font-size: 1.2em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.period {
    flex: none;
    font-size: 0.85em;
    opacity: 0.8;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
}
.body {
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    gap: 0.3em;
    /* what does not fit fades out instead of being cut through the middle of a line */
    -webkit-mask-image: linear-gradient(to bottom, #000 calc(100% - 0.7em), transparent);
    mask-image: linear-gradient(to bottom, #000 calc(100% - 0.7em), transparent);
}
.instruction {
    font-style: italic;
    opacity: 0.85;
}
.small .band {
    flex-direction: row;
    align-items: center;
    padding: 0 clamp(4px, 20cqh, 12px);
    font-size: clamp(11px, 40cqh, 22px);
    font-weight: 600;
}
.small .text {
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.none,
.hint {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5em;
    padding: 4px;
    text-align: center;
    color: var(--iob-text-secondary);
    overflow: hidden;
}
.none svg {
    flex: none;
    width: 1.3em;
    height: 1.3em;
    fill: var(--iob-success);
}
.hint {
    font-size: clamp(11px, 10cqmin, 15px);
}
.hint svg {
    flex: none;
    width: 1.5em;
    height: 1.5em;
    fill: currentColor;
}
.small .none,
.small .hint {
    justify-content: flex-start;
    font-size: clamp(11px, 40cqh, 16px);
    white-space: nowrap;
    text-overflow: ellipsis;
}
`;

/** The styles of the dialog with the whole warning; the host frames it with a title and a close button */
export const DETAILS_STYLES = `
:host {
    display: block;
}
.details {
    display: flex;
    flex-direction: column;
    gap: 12px;
    color: var(--iob-text);
    font-family: var(--iob-font-family);
    font-size: var(--iob-font-size);
    line-height: 1.4;
}
.band {
    padding: 8px 12px;
    border-radius: calc(var(--iob-border-radius) * 2);
}
.band.plain {
    border: 1px solid var(--iob-divider);
}
.headline {
    font-weight: 700;
    font-size: 1.15em;
}
.period {
    margin-top: 2px;
    font-size: 0.9em;
    opacity: 0.85;
    font-variant-numeric: tabular-nums;
}
.instruction {
    padding-left: 10px;
    border-left: 3px solid var(--iob-divider);
    color: var(--iob-text-secondary);
    font-style: italic;
}
p {
    margin: 0;
    white-space: pre-line;
}
`;
