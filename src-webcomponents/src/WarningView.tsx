import type { CSSProperties, JSX, KeyboardEvent } from 'react';

// the colour table and the date format of the native widgets - pure functions, compiled into this module
import { formatDate, severityColor, textColorOn } from '../../src-widgets/src/severity';
import { DEFAULT_TIME_FORMAT, type WarningState } from './constants';
import type { WordKey } from './i18n';

/** What the element shows: the values of the states of one `warning<n>` channel */
export type WarningValues = Partial<Record<WarningState, ioBroker.StateValue>>;

/** `WarningAmber` of the Material icons */
const WARNING_PATH = 'M12 5.99 19.53 19H4.47zM12 2 1 21h22zm1 14h-2v2h2zm0-6h-2v4h2z';
/** `CheckCircleOutline` of the Material icons */
const CHECK_PATH =
    'M16.59 7.58 10 14.17l-3.59-3.58L5 12l5 5 8-8zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8';

function Icon({ path }: { path: string }): JSX.Element {
    return (
        <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
        >
            <path d={path} />
        </svg>
    );
}

/**
 * A value as text, empty for none
 *
 * @param value the value of a state
 */
export function toText(value: ioBroker.StateValue | undefined): string {
    return value === null || value === undefined ? '' : String(value);
}

/**
 * Whether a warning is active: the adapter empties `headline` and `text` of the channels it does not need
 *
 * @param values the values of the channel
 */
export function hasWarning(values: WarningValues): boolean {
    return !!(toText(values.headline) || toText(values.text));
}

/**
 * Begin and end of the warning, as the native widgets print them
 *
 * @param values the values of the channel
 * @param format the format with the tokens of `formatDate`
 */
export function getPeriod(values: WarningValues, format: string | undefined): string {
    const fmt = format || DEFAULT_TIME_FORMAT;
    return [formatDate(values.begin, fmt), formatDate(values.end, fmt)].filter(Boolean).join(' - ');
}

/**
 * The colours of the band: the severity colour with black or white text on it; nothing for a severity without
 * a colour - then the band takes the colours of the host
 *
 * @param values the values of the channel
 */
export function getBandStyle(values: WarningValues): { style: CSSProperties; plain: boolean } {
    const background = severityColor(values.severity);
    return background
        ? { style: { backgroundColor: background, color: textColorOn(background) }, plain: false }
        : { style: {}, plain: true };
}

export function Hint({ text, small }: { text: string; small?: boolean }): JSX.Element {
    return (
        <div className={small ? 'box small' : 'box'}>
            <div className="hint">
                <Icon path={WARNING_PATH} />
                <span>{text}</span>
            </div>
        </div>
    );
}

export interface WarningViewProps {
    values: WarningValues;
    small: boolean;
    title: string;
    showPeriod: boolean;
    timeFormat: string | undefined;
    showInstruction: boolean;
    editMode: boolean;
    word: (key: WordKey) => string;
    /** Opens the whole warning; called only outside of the edit mode */
    onDetails: () => void;
}

/** One warning, or "No warning" */
export function WarningView(props: WarningViewProps): JSX.Element {
    const { values, small, word } = props;
    const classes = ['box'];
    if (small) {
        classes.push('small');
    }
    if (props.editMode) {
        classes.push('edit');
    }
    const title = small ? '' : props.title;

    if (!hasWarning(values)) {
        return (
            <div className={classes.join(' ')}>
                {title ? <div className="title">{title}</div> : null}
                <div className="none">
                    <Icon path={CHECK_PATH} />
                    <span>{word('noWarning')}</span>
                </div>
            </div>
        );
    }

    const band = getBandStyle(values);
    const clickable = !props.editMode;
    const onKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            props.onDetails();
        }
    };
    const bandProps = {
        className: ['band', band.plain ? 'plain' : '', clickable ? 'clickable' : ''].filter(Boolean).join(' '),
        style: band.style,
        title: clickable ? word('details') : undefined,
        role: clickable ? 'button' : undefined,
        tabIndex: clickable ? 0 : undefined,
        onClick: clickable ? props.onDetails : undefined,
        onKeyDown: clickable ? onKeyDown : undefined,
    };

    if (small) {
        return (
            <div className={classes.join(' ')}>
                <div {...bandProps}>
                    <span className="text">{toText(values.text) || toText(values.headline)}</span>
                </div>
            </div>
        );
    }

    const period = props.showPeriod ? getPeriod(values, props.timeFormat) : '';
    const instruction = props.showInstruction ? toText(values.instruction) : '';
    return (
        <div className={classes.join(' ')}>
            {title ? <div className="title">{title}</div> : null}
            <div {...bandProps}>
                <div className="head">
                    <span className="headline">{toText(values.headline) || toText(values.text)}</span>
                    {period ? <span className="period">{period}</span> : null}
                </div>
                <div className="body">
                    {toText(values.description) ? <div>{toText(values.description)}</div> : null}
                    {instruction ? <div className="instruction">{instruction}</div> : null}
                </div>
            </div>
        </div>
    );
}

export interface WarningDetailsProps {
    values: WarningValues;
    timeFormat: string | undefined;
    word: (key: WordKey) => string;
}

/** The whole warning, for the dialog: headline and period on the severity colour, description, instruction */
export function WarningDetails({ values, timeFormat, word }: WarningDetailsProps): JSX.Element {
    if (!hasWarning(values)) {
        return (
            <div className="details">
                <p>{word('noWarning')}</p>
            </div>
        );
    }
    const band = getBandStyle(values);
    const period = getPeriod(values, timeFormat);
    return (
        <div className="details">
            <div
                className={band.plain ? 'band plain' : 'band'}
                style={band.style}
            >
                <div className="headline">{toText(values.headline) || toText(values.text)}</div>
                {period ? <div className="period">{period}</div> : null}
            </div>
            {toText(values.description) ? <p>{toText(values.description)}</p> : null}
            {toText(values.instruction) ? <p className="instruction">{toText(values.instruction)}</p> : null}
        </div>
    );
}
