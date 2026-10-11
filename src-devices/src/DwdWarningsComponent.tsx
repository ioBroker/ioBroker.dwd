// DWD warning widget for ioBroker.devices - one warning of one instance as a tile.
//
// The object ids are derived from the instance and the warning number, exactly as the vis-2 widget
// does: `dwd.<instance>.warning<n>.{headline,text,description,instruction,severity,begin,end}`.
// The adapter creates as many `warning<n>` channels as configured in its settings, sorted by
// severity - so warning 0 is always the most severe one currently active. That first channel is
// `warning` without a number (it comes from instanceObjects), the others are `warning1`, `warning2`, ...

import WidgetGeneric, {
    React,
    MuiMaterial,
    getTileStyles,
    isNeumorphicTheme,
    AdapterReact,
    type WidgetGenericProps,
    type WidgetGenericState,
    type CustomWidgetPlugin,
} from '@iobroker/dm-widgets';
import type { BoxProps, Theme, TypographyProps } from '@mui/material';
import type { ConfigItemPanel, ConfigItemTabs } from '@iobroker/dm-utils';
import type { ConfigItemPanel as JsonConfigItemPanel } from '@iobroker/json-config';
import type { I18n as I18nType, Icon as IconType } from '@iobroker/gui-components';

import { WarningIcon } from './icons';
import { formatDate, severityColor, textColorOn } from './severity';

const Box: React.ComponentType<BoxProps> = MuiMaterial?.Box;
const Typography: React.ComponentType<TypographyProps> = MuiMaterial?.Typography;
const I18n = AdapterReact.I18n as typeof I18nType;
const Icon = AdapterReact.Icon as typeof IconType;

/** The states of one `warning<n>` channel this widget subscribes to. */
const STATES = ['text', 'headline', 'description', 'instruction', 'severity', 'begin', 'end'] as const;

type StateName = (typeof STATES)[number];

interface DwdWarningsSettings extends CustomWidgetPlugin {
    /** dwd adapter instance, e.g. `dwd.0` */
    instance?: string;
    /** Which `warning<n>` channel to show, 0 is the most severe one */
    warning?: number | string;
    /** Show the validity period below the text */
    showPeriod?: boolean;
    /** Show the instruction of the DWD */
    showInstruction?: boolean;
    /** Format of the begin/end timestamps */
    timeFormat?: string;
}

interface DwdWarningsComponentState extends WidgetGenericState {
    values: Partial<Record<StateName, ioBroker.StateValue>>;
}

export class DwdWarningsComponent extends WidgetGeneric<DwdWarningsComponentState, DwdWarningsSettings> {
    private subscribed: { id: string; handler: (id: string, state: ioBroker.State) => void }[] = [];

    constructor(props: WidgetGenericProps<DwdWarningsSettings>) {
        super(props);
        this.state = { ...this.state, values: {} };
    }

    static override getConfigSchema(): { name: string; schema: ConfigItemPanel | ConfigItemTabs } {
        const schema: JsonConfigItemPanel = {
            type: 'panel',
            items: {
                instance: {
                    type: 'instance',
                    adapter: 'dwd',
                    label: 'dwddm_instance',
                    default: 'dwd.0',
                    sm: 12,
                },
                warning: {
                    type: 'number',
                    min: 0,
                    max: 9,
                    label: 'dwddm_warning',
                    help: 'dwddm_warning_tooltip',
                    default: 0,
                    sm: 6,
                },
                timeFormat: {
                    type: 'text',
                    label: 'dwddm_time_format',
                    help: 'dwddm_time_format_tooltip',
                    default: 'DD.MM hh:mm',
                    sm: 6,
                },
                showPeriod: {
                    type: 'checkbox',
                    label: 'dwddm_show_period',
                    default: true,
                    sm: 6,
                },
                showInstruction: {
                    type: 'checkbox',
                    label: 'dwddm_show_instruction',
                    default: false,
                    sm: 6,
                },
                icon: {
                    type: 'component',
                    subType: 'iconSelect',
                    label: 'dwddm_icon',
                    sm: 6,
                },
                name: {
                    type: 'text',
                    label: 'dwddm_name',
                    sm: 12,
                },
            },
        };

        return { name: 'DwdWarnings', schema: schema };
    }

    private get instance(): string {
        return this.props.settings.instance || 'dwd.0';
    }

    /** `dwd.<instance>.warning<n>` - the first channel is `warning` without a number */
    private get channel(): string {
        const warning = parseInt(String(this.props.settings.warning ?? '0'), 10) || 0;
        return `${this.instance}.warning${warning || ''}`;
    }

    componentDidMount(): void {
        super.componentDidMount?.();
        this.subscribeStates();
    }

    componentDidUpdate(prevProps: Readonly<WidgetGenericProps<DwdWarningsSettings>>): void {
        super.componentDidUpdate?.(prevProps, this.state);
        if (
            prevProps.settings.instance !== this.props.settings.instance ||
            prevProps.settings.warning !== this.props.settings.warning
        ) {
            this.unsubscribeStates();
            this.setState({ values: {} }, () => this.subscribeStates());
        }
    }

    componentWillUnmount(): void {
        super.componentWillUnmount?.();
        this.unsubscribeStates();
    }

    private subscribeStates(): void {
        const context = this.props.stateContext;
        for (const name of STATES) {
            const id = `${this.channel}.${name}`;
            const handler = (_id: string, state: ioBroker.State): void => {
                this.setState(prev => ({ values: { ...prev.values, [name]: state ? state.val : null } }));
            };
            context.getState(id, handler);
            this.subscribed.push({ id, handler });
        }
    }

    private unsubscribeStates(): void {
        const context = this.props.stateContext;
        for (const { id, handler } of this.subscribed) {
            context.removeState(id, handler);
        }
        this.subscribed = [];
    }

    // ---- state access -------------------------------------------------------

    private str(name: StateName): string {
        const value = this.state.values[name];
        return value === null || value === undefined ? '' : String(value);
    }

    private get color(): string {
        return severityColor(this.state.values.severity);
    }

    /** Whether a warning is actually active - `headline` and `text` are empty when there is none. */
    private get hasWarning(): boolean {
        return !!(this.str('headline') || this.str('text'));
    }

    private get period(): string {
        if (!this.props.settings.showPeriod) {
            return '';
        }
        const format = this.props.settings.timeFormat || 'DD.MM hh:mm';
        return [formatDate(this.state.values.begin, format), formatDate(this.state.values.end, format)]
            .filter(Boolean)
            .join(' - ');
    }

    /** A coloured tile means "there is a warning" - that is what the severity colours are for. */
    protected isTileActive(): boolean {
        return this.hasWarning;
    }

    protected getAccentColor(): string | undefined {
        return this.color || undefined;
    }

    protected renderTileIcon(): React.JSX.Element | null {
        const custom = this.props.settings?.icon;
        if (custom) {
            return (
                <Icon
                    src={custom}
                    style={{ width: 22, height: 22, flex: '0 0 auto' }}
                />
            );
        }
        return <WarningIcon />;
    }

    // ---- pieces -------------------------------------------------------------

    private get title(): string {
        return this.props.settings.name || this.state.name || I18n.t('dwddm_title');
    }

    /**
     * The coloured band that carries the severity. It keeps its colour in both themes - the colour
     * is the meaning of the warning, not decoration - so the text colour is derived from it.
     */
    private renderBand(children: React.ReactNode, compact?: boolean): React.JSX.Element {
        const background = this.color;
        return (
            <Box
                sx={{
                    borderRadius: 1,
                    px: compact ? 0.5 : 1,
                    py: compact ? 0.25 : 0.5,
                    minWidth: 0,
                    backgroundColor: background || 'transparent',
                    color: textColorOn(background),
                }}
            >
                {children}
            </Box>
        );
    }

    private renderNoWarning(): React.JSX.Element {
        return (
            <Typography
                variant="caption"
                sx={{ opacity: 0.6 }}
            >
                {I18n.t('dwddm_no_warning')}
            </Typography>
        );
    }

    private renderTile(
        outerStyle: (theme: Theme) => React.CSSProperties,
        padding: (neumorphic: boolean) => string,
        inner: React.CSSProperties,
        content: React.JSX.Element,
    ): React.JSX.Element {
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();

        return (
            <Box
                id={String(this.props.widget.id)}
                className={this.getWidgetClass()}
                sx={outerStyle}
            >
                <Box
                    sx={theme => ({
                        boxSizing: 'border-box',
                        display: 'flex',
                        width: '100%',
                        overflow: 'hidden',
                        ...(getTileStyles(theme, isActive, accent) as Record<string, unknown>),
                        padding: padding(isNeumorphicTheme(theme)),
                        ...inner,
                    })}
                >
                    <div
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        style={{ display: 'contents' }}
                    >
                        {this.renderIndicators(this.renderSettingsButton())}
                    </div>
                    {content}
                </Box>
            </Box>
        );
    }

    // ---- sizes --------------------------------------------------------------

    /** 1x1 - the icon and the short warning text. */
    renderCompact(): React.JSX.Element {
        const content = (
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    width: '100%',
                    aspectRatio: '1',
                    minWidth: 0,
                }}
            >
                <WarningIcon sx={{ fontSize: 'max(24px, 14cqi)', color: this.color || undefined }} />
                {this.hasWarning ? (
                    <Typography
                        variant="caption"
                        sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}
                    >
                        {this.str('text') || this.str('headline')}
                    </Typography>
                ) : (
                    this.renderNoWarning()
                )}
            </Box>
        );

        return this.renderTile(
            theme => WidgetGeneric.getStyleCompact(theme),
            neumorphic => (neumorphic ? '10px' : '12px'),
            { flexDirection: 'column' },
            content,
        );
    }

    /** 2x0.5 - one strip: icon, warning text, period. */
    renderWide(): React.JSX.Element {
        const content = (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', minWidth: 0 }}>
                <WarningIcon sx={{ fontSize: '1.4rem', flex: '0 0 auto', color: this.color || undefined }} />
                {this.hasWarning ? (
                    <>
                        {this.renderBand(
                            <Typography
                                variant="body2"
                                sx={{
                                    fontWeight: 600,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}
                            >
                                {this.str('text') || this.str('headline')}
                            </Typography>,
                            true,
                        )}
                        {this.period ? (
                            <Typography
                                variant="caption"
                                sx={{ opacity: 0.6, ml: 'auto', flex: '0 0 auto' }}
                            >
                                {this.period}
                            </Typography>
                        ) : null}
                    </>
                ) : (
                    this.renderNoWarning()
                )}
            </Box>
        );

        return this.renderTile(
            theme => WidgetGeneric.getStyleWide(theme),
            neumorphic => (neumorphic ? '6px' : '8px'),
            { alignItems: 'center' },
            content,
        );
    }

    /** 2x1 and 2x2 - headline, description, period and optionally the instruction. */
    renderWideTall(): React.JSX.Element {
        const content = (
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.5,
                    width: '100%',
                    height: '100%',
                    minHeight: 0,
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                    <WarningIcon sx={{ fontSize: '1.2rem', flex: '0 0 auto', color: this.color || undefined }} />
                    <Typography
                        ref={this.nameRef}
                        variant="caption"
                        sx={{ fontWeight: 600, opacity: 0.75, whiteSpace: 'nowrap', overflow: 'hidden' }}
                    >
                        {this.title}
                    </Typography>
                    {this.period ? (
                        <Typography
                            variant="caption"
                            sx={{ opacity: 0.6, ml: 'auto', flex: '0 0 auto' }}
                        >
                            {this.period}
                        </Typography>
                    ) : null}
                </Box>

                {this.hasWarning ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minHeight: 0, overflow: 'auto' }}>
                        {this.renderBand(
                            <Typography
                                variant="body2"
                                sx={{ fontWeight: 700 }}
                            >
                                {this.str('headline') || this.str('text')}
                            </Typography>,
                        )}
                        <Typography
                            variant="caption"
                            sx={{ opacity: 0.85 }}
                        >
                            {this.str('description')}
                        </Typography>
                        {this.props.settings.showInstruction && this.str('instruction') ? (
                            <Typography
                                variant="caption"
                                sx={{ opacity: 0.7, fontStyle: 'italic' }}
                            >
                                {this.str('instruction')}
                            </Typography>
                        ) : null}
                    </Box>
                ) : (
                    this.renderNoWarning()
                )}
            </Box>
        );

        return this.renderTile(
            theme => WidgetGeneric.getStyleWideTall(theme),
            neumorphic => (neumorphic ? '8px' : '10px'),
            { flexDirection: 'column', height: '100%' },
            content,
        );
    }
}

export default DwdWarningsComponent;
