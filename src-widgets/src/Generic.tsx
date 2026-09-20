import type { VisRxWidgetState } from '@iobroker/types-vis-2';
import type VisRxWidget from '@iobroker/types-vis-2/visRxWidget';

/**
 * Base class of the DWD vis-2 widgets.
 *
 * `window.visRxWidget` is provided by the vis-2 runtime and must not be imported as a value:
 * a second copy of the base class would not be recognised by vis-2.
 */
export default class Generic<
    RxData extends Record<string, any>,
    State extends Partial<VisRxWidgetState> = VisRxWidgetState,
> extends (window.visRxWidget as typeof VisRxWidget)<RxData, State> {
    /** Prepended to every i18n key of this widget set, see `translations.ts` */
    static getI18nPrefix(): string {
        return 'dwd_';
    }
}
