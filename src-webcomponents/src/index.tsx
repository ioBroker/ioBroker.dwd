/**
 * A weather warning of the DWD adapter as a web component: `<iob-dwd-warnings>`.
 *
 * One module for every host - vis-2, devices, Aura, admin (`@iobroker/web-components`). Its manifest is a file of
 * its own (`dwd-warnings.json`, written by the build from `manifest.ts`), so a host loads this module only when it
 * shows the element. The host sets `socket` and `settings`, and if it has them `theme`, `editMode` and `dialogs`.
 *
 * The element reads the states of one channel, `dwd.<n>.warning<k>` or `dwd.<n>.warncell.warning<k>` - the same the
 * vis-2 widget and the devices tile read. It writes nothing. A click on the warning shows all of it in a dialog of
 * the host, after the event `dwd-warning-click` - a host that answers it itself calls `preventDefault()`.
 *
 * React is not in the module: it comes from `lib/esm/react-19.js` beside `adapter/`, see `vite.config.ts`.
 */
import type { JSX } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { defineWebComponent, getThemeCssVariables, IobWebComponent } from '@iobroker/web-components/element';

import { getChannel, TAG, WARNING_STATES, type WarningsSettings } from './constants';
import { getWord, type WordKey } from './i18n';
import { DETAILS_STYLES, STYLES } from './styles';
import { Hint, toText, WarningDetails, WarningView, type WarningValues } from './WarningView';

/** The event a click on the warning sends to the host before the element shows the dialog */
const CLICK_EVENT = 'dwd-warning-click';

class DwdWarnings extends IobWebComponent<WarningsSettings> {
    readonly #root: Root;

    /** Draws the open dialog again with the current values; null while none is open */
    #drawDetails: (() => void) | null = null;

    constructor() {
        super();
        const shadow = this.attachShadow({ mode: 'open' });
        const style = document.createElement('style');
        style.textContent = STYLES;
        const mount = document.createElement('div');
        mount.className = 'mount';
        shadow.append(style, mount);
        this.#root = createRoot(mount);
    }

    protected override getStateIds(settings: WarningsSettings): string[] {
        const channel = getChannel(settings);
        return channel ? WARNING_STATES.map(name => `${channel}.${name}`) : [];
    }

    #word = (key: WordKey): string => getWord(this.systemLang, key);

    /** The values of the channel of the settings */
    #values(channel: string): WarningValues {
        const values: WarningValues = {};
        for (const name of WARNING_STATES) {
            values[name] = this.states[`${channel}.${name}`]?.val;
        }
        return values;
    }

    protected override render(): void {
        this.#root.render(this.#view());
        // an open dialog follows the states too
        this.#drawDetails?.();
    }

    /** What the element shows for the current settings and states */
    #view(): JSX.Element {
        const settings = this.settings;
        const small = settings.layout === 'small';
        const channel = getChannel(settings);

        if (!channel) {
            return (
                <Hint
                    text={this.#word('chooseInstance')}
                    small={small}
                />
            );
        }

        // The objects of the states are read once: `null` - the adapter did not create this channel
        if (this.objects[`${channel}.headline`] === null) {
            const index = Number(settings.warning) || 0;
            return (
                <Hint
                    text={this.#word(settings.source === 'warncell' && !index ? 'noWarncell' : 'noChannel')}
                    small={small}
                />
            );
        }

        // Nothing yet rather than "No warning" for a moment: no socket, or the states have not arrived
        if (
            !this.socket ||
            (this.states[`${channel}.headline`] === undefined && this.states[`${channel}.text`] === undefined)
        ) {
            return <div className={small ? 'box small' : 'box'} />;
        }

        return (
            <WarningView
                values={this.#values(channel)}
                small={small}
                title={settings.title || ''}
                showPeriod={settings.showPeriod !== false}
                timeFormat={settings.timeFormat}
                showInstruction={!!settings.showInstruction}
                editMode={this.editMode}
                word={this.#word}
                onDetails={() => void this.#openDetails(channel)}
            />
        );
    }

    /**
     * Shows the whole warning in a dialog of the host - unless the host answers the click itself
     *
     * @param channel the channel the click was on
     */
    async #openDetails(channel: string): Promise<void> {
        if (this.editMode || this.#drawDetails || !this.emit(CLICK_EVENT, { channel })) {
            return;
        }

        // The host moves the element into its own dialog: it brings its styles and the theme of the host along
        const element = document.createElement('div');
        for (const [name, value] of Object.entries(getThemeCssVariables(this.theme))) {
            element.style.setProperty(name, value);
        }
        const shadow = element.attachShadow({ mode: 'open' });
        const style = document.createElement('style');
        style.textContent = DETAILS_STYLES;
        const mount = document.createElement('div');
        shadow.append(style, mount);
        const root = createRoot(mount);

        // drawn again with every drawing of the element, so the dialog follows the states while it is open
        const draw = (): void => {
            const current = getChannel(this.settings) === channel ? channel : null;
            root.render(
                <WarningDetails
                    values={current ? this.#values(current) : {}}
                    timeFormat={this.settings.timeFormat}
                    word={this.#word}
                />,
            );
        };
        this.#drawDetails = draw;
        draw();

        const values = this.#values(channel);
        try {
            await this.openDialog({
                title: toText(values.text) || toText(values.headline) || undefined,
                element,
                width: 560,
            });
        } finally {
            this.#drawDetails = null;
            root.unmount();
        }
    }
}

defineWebComponent(TAG, DwdWarnings);
