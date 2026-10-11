import React from 'react';

import type { RxRenderWidgetProps, RxWidgetInfo, VisRxWidgetProps, VisRxWidgetState } from '@iobroker/types-vis-2';

import Generic from './Generic';
import { formatDate, severityColor, textColorOn } from './severity';

/** The states of one `warning<n>` channel this widget reads. */
type StateKey = 'text' | 'headline' | 'description' | 'instruction' | 'severity' | 'begin' | 'end';

/**
 * The attribute names of the vis-1 templates. A view built with `tplDwdAdapter` or
 * `tplDwdAdapterSmall` stores its object ids under exactly these keys, and this widget replaces
 * `tplDwdAdapter` under the same template id - so they have to keep working.
 *
 * `oid` is the main text of the old widget: the description in `tplDwdAdapter`, the warning text in
 * `tplDwdAdapterSmall`.
 */
const LEGACY_OIDS: Record<Exclude<StateKey, 'text' | 'description'> | 'main', string> = {
    main: 'oid',
    headline: 'oid-headline',
    instruction: 'oid-hint',
    severity: 'oid-severity',
    begin: 'oid-begin',
    end: 'oid-end',
};

const styles: Record<string, React.CSSProperties> = {
    normal: {
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        padding: 3,
        fontFamily: 'Arial',
        overflow: 'hidden',
    },
    small: {
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        padding: 3,
        fontFamily: 'Arial',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
    },
    headline: { fontSize: '1.5em', fontWeight: 'bold' },
    paragraph: { margin: '1em 0' },
};

interface DwdWarningsRxData {
    /** `normal` - headline, description, period and instruction. `small` - the warning text only. */
    layout: 'normal' | 'small';
    /** Instance number of the dwd adapter, e.g. `0` */
    instance: string;
    /** Which `warning<n>` channel to show */
    warning: string | number;
    /** Format of the begin/end timestamps, vis-1 token syntax */
    'dwd-format': string;
    showInstruction: boolean;
    useOids: boolean;
    noCard: boolean;
    widgetTitle: string;

    // the attributes of the vis-1 templates, see LEGACY_OIDS
    oid?: string;
    'oid-headline'?: string;
    'oid-severity'?: string;
    'oid-begin'?: string;
    'oid-end'?: string;
    'oid-hint'?: string;
}

interface DwdWarningsState extends VisRxWidgetState {
    /** State values keyed by object id */
    dwd: Record<string, ioBroker.StateValue>;
}

/**
 * The weather warnings of the DWD adapter.
 *
 * Replaces the vis-1 template `tplDwdAdapter`; the compact variant of the old set
 * (`tplDwdAdapterSmall`) is the `small` value of the `layout` setting.
 */
export default class DwdWarnings extends Generic<DwdWarningsRxData, DwdWarningsState> {
    private subscribed: string[] = [];

    constructor(props: VisRxWidgetProps) {
        super(props);
        this.state = { ...this.state, dwd: {} };
    }

    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplDwdAdapter',
            visSet: 'dwd',
            visName: 'DWD warnings',
            visWidgetLabel: 'warnings',
            visAttrs: [
                {
                    name: 'common',
                    fields: [
                        {
                            name: 'layout',
                            type: 'select',
                            default: 'normal',
                            label: 'layout',
                            options: [
                                { value: 'normal', label: 'layout_normal' },
                                { value: 'small', label: 'layout_small' },
                            ],
                        },
                        {
                            name: 'instance',
                            type: 'instance',
                            adapter: 'dwd',
                            isShort: true,
                            default: '0',
                            label: 'instance',
                            hidden: '!!data.useOids',
                        },
                        {
                            name: 'warning',
                            type: 'number',
                            min: 0,
                            max: 9,
                            default: 0,
                            label: 'warning_index',
                            tooltip: 'warning_index_tooltip',
                            hidden: '!!data.useOids',
                        },
                        {
                            name: 'dwd-format',
                            type: 'text',
                            default: 'DD.MM hh:mm',
                            label: 'time_format',
                            tooltip: 'time_format_tooltip',
                            hidden: 'data.layout === "small"',
                        },
                        {
                            name: 'showInstruction',
                            type: 'checkbox',
                            default: true,
                            label: 'show_instruction',
                            hidden: 'data.layout === "small"',
                        },
                        { name: 'noCard', type: 'checkbox', label: 'without_card' },
                        { name: 'widgetTitle', label: 'name', hidden: '!!data.noCard' },
                    ],
                },
                {
                    name: 'oids',
                    label: 'custom_oids',
                    fields: [
                        { name: 'useOids', type: 'checkbox', label: 'use_oids', tooltip: 'use_oids_tooltip' },
                        { name: 'oid', type: 'id', label: 'oid_main', hidden: '!data.useOids' },
                        { name: 'oid-headline', type: 'id', label: 'oid_headline', hidden: '!data.useOids' },
                        { name: 'oid-severity', type: 'id', label: 'oid_severity', hidden: '!data.useOids' },
                        { name: 'oid-begin', type: 'id', label: 'oid_begin', hidden: '!data.useOids' },
                        { name: 'oid-end', type: 'id', label: 'oid_end', hidden: '!data.useOids' },
                        { name: 'oid-hint', type: 'id', label: 'oid_instruction', hidden: '!data.useOids' },
                    ],
                },
            ],
            visDefaultStyle: { width: 585, height: 85, position: 'relative' },
            visPrev: 'widgets/dwd/img/Prev_DwdAdapter.png',
        };
    }

    getWidgetInfo(): RxWidgetInfo {
        return DwdWarnings.getWidgetInfo();
    }

    componentDidMount(): void {
        super.componentDidMount();
        this.resubscribe();
    }

    componentWillUnmount(): void {
        this.unsubscribeAll();
        super.componentWillUnmount();
    }

    onRxDataChanged(): void {
        this.resubscribe();
    }

    /**
     * Whether the object ids are configured by hand.
     *
     * A view migrated from the vis-1 widget has no `useOids` but does carry the old `oid-*`
     * attributes - those must win, otherwise the widget would silently show a different warning
     * than before.
     */
    private usesOids(): boolean {
        return !!this.state.rxData.useOids || Object.values(LEGACY_OIDS).some(attr => !!this.legacy(attr));
    }

    /**
     * One of the vis-1 attributes. They carry a dash in the name and are not part of the declared
     * attribute list of the normal configuration, so they are read through the raw data.
     */
    private legacy(attr: string): string {
        const value = (this.state.rxData as unknown as Record<string, string | undefined>)[attr];
        return value === null || value === undefined ? '' : String(value);
    }

    /** `dwd.<instance>.warning<n>` - the first channel is `warning` without a number */
    private channel(): string {
        const instance = parseInt(String(this.state.rxData.instance ?? '0'), 10) || 0;
        const warning = parseInt(String(this.state.rxData.warning ?? '0'), 10) || 0;
        return `dwd.${instance}.warning${warning || ''}`;
    }

    /**
     * The object id per state, either from the configured attributes or derived from instance and
     * warning index. The main text is the description in the normal layout and the warning text in
     * the compact one - the same split the two vis-1 templates had.
     */
    private ids(): Partial<Record<StateKey | 'main', string>> {
        if (this.usesOids()) {
            return {
                main: this.legacy(LEGACY_OIDS.main),
                headline: this.legacy(LEGACY_OIDS.headline),
                severity: this.legacy(LEGACY_OIDS.severity),
                begin: this.legacy(LEGACY_OIDS.begin),
                end: this.legacy(LEGACY_OIDS.end),
                instruction: this.legacy(LEGACY_OIDS.instruction),
            };
        }

        const channel = this.channel();
        return {
            main: `${channel}.${this.state.rxData.layout === 'small' ? 'text' : 'description'}`,
            headline: `${channel}.headline`,
            severity: `${channel}.severity`,
            begin: `${channel}.begin`,
            end: `${channel}.end`,
            instruction: `${channel}.instruction`,
        };
    }

    private onStateChange = (id: string, state: ioBroker.State | null | undefined): void => {
        this.setState(prev => ({ dwd: { ...prev.dwd, [id]: state ? state.val : null } }));
    };

    private unsubscribeAll(): void {
        if (this.subscribed.length) {
            this.props.context.socket.unsubscribeState(this.subscribed, this.onStateChange);
            this.subscribed = [];
        }
    }

    private resubscribe(): void {
        const wanted = [...new Set(Object.values(this.ids()).filter((id): id is string => !!id))];

        if (wanted.length === this.subscribed.length && wanted.every(id => this.subscribed.includes(id))) {
            return;
        }

        this.unsubscribeAll();
        if (!wanted.length) {
            return;
        }

        this.subscribed = wanted;
        this.props.context.socket.subscribeState(wanted, this.onStateChange).catch((e: unknown) => {
            console.warn(`Cannot subscribe on DWD states: ${e as string}`);
        });
    }

    private value(id: string | undefined): ioBroker.StateValue | undefined {
        return id ? this.state.dwd[id] : undefined;
    }

    private text(id: string | undefined): string {
        const value = this.value(id);
        return value === null || value === undefined ? '' : String(value);
    }

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element | React.JSX.Element[] | null {
        super.renderWidgetBody(props);

        const ids = this.ids();
        const background = severityColor(this.value(ids.severity));
        const color = textColorOn(background);
        const small = this.state.rxData.layout === 'small';

        const period = small
            ? ''
            : [
                  formatDate(this.value(ids.begin), this.state.rxData['dwd-format']),
                  formatDate(this.value(ids.end), this.state.rxData['dwd-format']),
              ]
                  .filter(Boolean)
                  .join(' - ');

        const content = small ? (
            <div style={{ ...styles.small, backgroundColor: background || undefined, color }}>
                {this.text(ids.main)}
            </div>
        ) : (
            <div style={{ ...styles.normal, backgroundColor: background || undefined, color }}>
                <div style={styles.headline}>{this.text(ids.headline)}</div>
                <p style={styles.paragraph}>
                    {this.text(ids.main)}
                    {period ? <br /> : null}
                    {period}
                </p>
                {this.state.rxData.showInstruction && this.text(ids.instruction) ? (
                    <p style={styles.paragraph}>{this.text(ids.instruction)}</p>
                ) : null}
            </div>
        );

        return this.state.rxData.noCard ? content : this.wrapContent(content);
    }
}
