// The icons of the DWD widget, resolved through the host's shared MUI bridge.

import { React, MuiMaterial, MuiIcons } from '@iobroker/dm-widgets';
import type { BoxProps } from '@mui/material';

const Box: React.ComponentType<BoxProps> = MuiMaterial?.Box;

export interface GlyphProps {
    sx?: BoxProps['sx'];
}

/**
 * An icon from the host's `@mui/icons-material` bridge, with a text glyph as fallback.
 *
 * The host bridges the whole icon namespace, but rendering `undefined` as a component would tear
 * down the entire category - so a missing icon degrades to its glyph instead of to a crash.
 */
export function bridgedIcon(name: string, glyph: string): React.ComponentType<GlyphProps> {
    const Component = (MuiIcons as Record<string, React.ComponentType<GlyphProps>> | undefined)?.[name];
    if (Component) {
        return Component;
    }
    return function GlyphIcon({ sx }: GlyphProps): React.JSX.Element {
        return (
            <Box
                component="span"
                sx={{ lineHeight: 1, ...(sx as object) }}
            >
                {glyph}
            </Box>
        );
    };
}

export const WarningIcon = bridgedIcon('WarningAmber', '⚠');
