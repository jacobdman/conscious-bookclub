import { createTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { EMOJI_FONT_FALLBACK, TYPOGRAPHY_FONT_FAMILY } from 'utils/emojiFont';
import { getPlatform } from 'utils/platformHelpers';

/** SF Pro / system UI on iOS; keep emoji fallbacks for reactions and pickers. */
export const IOS_TYPOGRAPHY_FONT_FAMILY = `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, ${EMOJI_FONT_FALLBACK}`;

export const baseThemeOptions = {
  palette: {
    primary: {
      main: '#5D473A',
    },
    secondary: {
      main: '#BFA480',
    },
    success: {
      main: '#5B7D67',
    },
    accent: {
      main: '#D19A3E',
    },
    warning: {
      main: '#B9895E',
    },
    error: {
      main: '#A45C5C',
    },
    info: {
      main: '#5F7C8B',
    },
    background: {
      default: '#F5F1EA',
    },
  },
  typography: {
    fontFamily: TYPOGRAPHY_FONT_FAMILY,
  },
};

const componentOverrides = {
  MuiIconButton: {
    styleOverrides: {
      root: ({ ownerState, theme }) => {
        if (theme.palette.mode !== 'dark') {
          return {};
        }
        const isDefault =
          !ownerState.color || ownerState.color === 'default' || ownerState.color === 'inherit';
        return isDefault
          ? {
              color: theme.palette.text.secondary,
              backgroundColor: theme.palette.action.selected,
              '&:hover': {
                color: theme.palette.text.primary,
                backgroundColor: theme.palette.action.hover,
              },
            }
          : {};
      },
    },
  },
  MuiSvgIcon: {
    styleOverrides: {
      root: ({ theme }) =>
        theme.palette.mode === 'dark'
          ? {
              color: theme.palette.text.secondary,
            }
          : {},
    },
  },
  MuiButton: {
    styleOverrides: {
      root: ({ ownerState, theme }) => {
        if (theme.palette.mode === 'dark') {
          if (ownerState.variant === 'text') {
            const paletteKey = ownerState.color;
            const paletteColor = paletteKey && theme.palette[paletteKey];
            return {
              color:
                paletteColor?.light ||
                paletteColor?.main ||
                theme.palette.text.primary,
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
              },
            };
          }

          if (ownerState.variant === 'contained') {
            const paletteKey = ownerState.color || 'primary';
            const paletteColor = theme.palette[paletteKey];
            const backgroundColor = paletteColor?.main || theme.palette.primary.main;
            return {
              color: theme.palette.getContrastText(backgroundColor),
            };
          }

          if (ownerState.variant === 'outlined') {
            const paletteKey = ownerState.color;
            const paletteColor = paletteKey && theme.palette[paletteKey];
            return {
              borderColor: paletteColor?.light || theme.palette.divider,
              color: paletteColor?.light || theme.palette.text.primary,
              '&:hover': {
                borderColor: paletteColor?.main || theme.palette.text.secondary,
                backgroundColor: theme.palette.action.hover,
              },
            };
          }
        }

        return {};
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: ({ ownerState, theme }) => {
        if (theme.palette.mode !== 'dark') {
          return {};
        }
        const isDefault =
          !ownerState.color || ownerState.color === 'default' || ownerState.color === 'inherit';
        return isDefault
          ? {
              backgroundColor: theme.palette.action.selected,
              color: theme.palette.text.primary,
              borderColor: theme.palette.divider,
            }
          : {};
      },
      outlined: ({ ownerState, theme }) => {
        if (theme.palette.mode !== 'dark') {
          return {};
        }
        const isDefault =
          !ownerState.color || ownerState.color === 'default' || ownerState.color === 'inherit';
        return isDefault
          ? {
              backgroundColor: theme.palette.action.selected,
              borderColor: theme.palette.divider,
            }
          : {};
      },
    },
  },
  MuiInputBase: {
    styleOverrides: {
      root: ({ theme }) =>
        theme.palette.mode === 'dark'
          ? {
              color: theme.palette.text.primary,
            }
          : {},
      input: ({ theme }) =>
        theme.palette.mode === 'dark'
          ? {
              '::placeholder': {
                color: theme.palette.text.secondary,
                opacity: 1,
              },
            }
          : {},
    },
  },
  MuiInputAdornment: {
    styleOverrides: {
      root: ({ theme }) =>
        theme.palette.mode === 'dark'
          ? {
              color: theme.palette.text.secondary,
            }
          : {},
    },
  },
  MuiSelect: {
    styleOverrides: {
      icon: ({ theme }) =>
        theme.palette.mode === 'dark'
          ? {
              color: theme.palette.text.secondary,
            }
          : {},
    },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: ({ theme }) =>
        theme.palette.mode === 'dark'
          ? {
              backgroundColor: theme.palette.background.default,
              '& fieldset': {
                borderColor: theme.palette.divider,
              },
              '&:hover fieldset': {
                borderColor: theme.palette.text.secondary,
              },
              '&.Mui-focused fieldset': {
                borderColor: theme.palette.primary.main,
              },
            }
          : {},
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: ({ theme }) =>
        theme.palette.mode === 'dark'
          ? {
              backgroundImage: 'none',
            }
          : {},
    },
  },
  MuiDivider: {
    styleOverrides: {
      root: ({ theme }) =>
        theme.palette.mode === 'dark'
          ? {
              borderColor: theme.palette.divider,
            }
          : {},
    },
  },
  MuiTab: {
    styleOverrides: {
      root: ({ theme }) =>
        theme.palette.mode === 'dark'
          ? {
              color: theme.palette.text.secondary,
              '&.Mui-selected': {
                color: theme.palette.text.primary,
              },
            }
          : {},
    },
  },
  MuiTabs: {
    styleOverrides: {
      indicator: ({ theme }) =>
        theme.palette.mode === 'dark'
          ? {
              backgroundColor: theme.palette.primary.main,
            }
          : {},
    },
  },
  MuiTypography: {
    styleOverrides: {
      root: ({ ownerState, theme }) => {
        if (theme.palette.mode === 'dark' && ownerState.color === 'primary') {
          return {
            color: theme.palette.text.primary,
          };
        }
        return {};
      },
    },
  },
  MuiBottomNavigationAction: {
    styleOverrides: {
      root: ({ theme }) =>
        theme.palette.mode === 'dark'
          ? {
              color: theme.palette.text.secondary,
              '&.Mui-selected': {
                color: theme.palette.text.primary,
              },
            }
          : {},
    },
  },
  MuiDialog: {
    defaultProps: {
      slotProps: {
        paper: {
          elevation: 0,
        },
      },
    },
    styleOverrides: {
      backdrop: ({ theme }) => ({
        backgroundColor:
          theme.palette.mode === 'dark'
            ? alpha(theme.palette.common.black, 0.48)
            : alpha(theme.palette.common.black, 0.22),
        backdropFilter: 'blur(28px) saturate(175%)',
        WebkitBackdropFilter: 'blur(28px) saturate(175%)',
      }),
      paper: ({ theme }) => {
        const isDark = theme.palette.mode === 'dark';
        return {
          borderRadius: 3,
          textAlign: 'left',
          backgroundColor: isDark
            ? alpha(theme.palette.background.paper, 0.42)
            : alpha(theme.palette.background.paper, 0.52),
          backdropFilter: 'blur(52px) saturate(200%)',
          WebkitBackdropFilter: 'blur(52px) saturate(200%)',
          border: `1px solid ${
            isDark
              ? alpha(theme.palette.common.white, 0.14)
              : alpha(theme.palette.common.white, 0.55)
          }`,
          boxShadow:
            theme.palette.mode === 'dark'
              ? `0 24px 64px ${alpha(theme.palette.common.black, 0.45)}`
              : `0 20px 56px ${alpha(theme.palette.common.black, 0.1)}, 0 0 0 1px ${alpha(theme.palette.common.black, 0.04)}`,
          overflowY: 'auto',
        };
      },
      container: {
        paddingTop: 'max(20px, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(20px, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(20px, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(20px, env(safe-area-inset-right, 0px))',
      },
      paperFullScreen: {
        height: 'auto',
        maxHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        overflow: 'hidden',
      },
    },
  },
  MuiSnackbar: {
    styleOverrides: {
      root: {
        '& .MuiPaper-root': {
          borderRadius: 999,
          overflow: 'hidden',
          backdropFilter: 'saturate(180%) blur(20px)',
          WebkitBackdropFilter: 'saturate(180%) blur(20px)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
        },
        '& .MuiAlert-root': {
          borderRadius: 999,
          alignItems: 'center',
        },
        '& .MuiAlert-icon': {
          marginRight: 8,
        },
        '& .MuiAlert-action': {
          paddingTop: 0,
          marginRight: 0,
        },
      },
    },
  },
};

/** MUI component overrides applied only when running Capacitor iOS (native feel). */
const iosNativeComponentOverrides = {
  MuiSwitch: {
    defaultProps: {
      disableRipple: true,
      disableFocusRipple: true,
      disableTouchRipple: true,
    },
    styleOverrides: {
      root: ({ theme }) => ({
        width: 51,
        height: 31,
        padding: 0,
        margin: '4px 8px 4px 0',
        '& .MuiSwitch-switchBase': {
          padding: 2,
          margin: 0,
          transitionDuration: '200ms',
          '&:hover': { backgroundColor: 'transparent' },
          '&.Mui-checked': {
            transform: 'translateX(20px)',
            color: '#fff',
            '& + .MuiSwitch-track': {
              backgroundColor: '#34C759',
              opacity: 1,
              border: 0,
            },
            '&.Mui-disabled + .MuiSwitch-track': {
              opacity: 0.5,
            },
          },
          '&.Mui-focusVisible .MuiSwitch-thumb': {
            color: '#34C759',
            border: '6px solid #fff',
          },
          '&.Mui-disabled .MuiSwitch-thumb': {
            opacity: 0.5,
          },
        },
        '& .MuiSwitch-thumb': {
          boxSizing: 'border-box',
          width: 27,
          height: 27,
          backgroundColor: '#fff',
          boxShadow: '0 2px 4px rgba(0,0,0,0.12), 0 0 1px rgba(0,0,0,0.04)',
        },
        '& .MuiSwitch-track': {
          borderRadius: 31 / 2,
          backgroundColor:
            theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.22) : '#E9E9EA',
          opacity: 1,
          border: 0,
          boxSizing: 'border-box',
          transition: 'background-color 200ms',
        },
      }),
    },
  },
};

const mergeComponentOverrides = (base, extra) => {
  const keys = new Set([...Object.keys(base), ...Object.keys(extra)]);
  const merged = { ...base };
  keys.forEach((key) => {
    if (!extra[key]) return;
    if (!merged[key]) {
      merged[key] = extra[key];
      return;
    }
    merged[key] = {
      ...merged[key],
      ...extra[key],
      styleOverrides: {
        ...(merged[key].styleOverrides || {}),
        ...(extra[key].styleOverrides || {}),
      },
      defaultProps: {
        ...(merged[key].defaultProps || {}),
        ...(extra[key].defaultProps || {}),
      },
    };
  });
  return merged;
};

const applyDarkModePaletteDefaults = (palette) => {
  const textPrimary = palette.text?.primary || '#F5F1EA';
  const textSecondary = palette.text?.secondary || alpha(textPrimary, 0.72);
  const backgroundDefault = palette.background?.default || '#181512';
  const backgroundPaper = palette.background?.paper || '#221C17';
  const divider = palette.divider || alpha(textPrimary, 0.12);

  const selectedBase =
    palette.primary?.light || palette.primary?.main || textPrimary;
  const action = {
    ...palette.action,
    active: palette.action?.active || textSecondary,
    hover: palette.action?.hover || alpha(textPrimary, 0.08),
    selected: alpha(selectedBase, 0.2),
    disabled: palette.action?.disabled || alpha(textPrimary, 0.36),
    disabledBackground: palette.action?.disabledBackground || alpha(textPrimary, 0.18),
    focus: palette.action?.focus || alpha(textPrimary, 0.12),
  };

  return {
    ...palette,
    text: {
      primary: textPrimary,
      secondary: textSecondary,
    },
    background: {
      default: backgroundDefault,
      paper: backgroundPaper,
    },
    divider,
    action,
  };
};

export const buildTheme = (overrides = {}) => {
  const isIosNative = getPlatform() === 'ios';
  const typography = isIosNative
    ? { ...baseThemeOptions.typography, fontFamily: IOS_TYPOGRAPHY_FONT_FAMILY }
    : baseThemeOptions.typography;
  const components = isIosNative
    ? mergeComponentOverrides(componentOverrides, iosNativeComponentOverrides)
    : componentOverrides;

  const theme = createTheme(
    { ...baseThemeOptions, typography, components },
    overrides || {},
  );
  const palette = theme.palette || {};
  const augment = palette.augmentColor;

  const modeAdjustedPalette =
    palette.mode === 'dark' ? applyDarkModePaletteDefaults(palette) : palette;
  const themeWithPalette = createTheme({ ...theme, palette: modeAdjustedPalette });

  if (typeof augment === 'function') {
    const keysToAugment = ['primary', 'secondary', 'success', 'warning', 'error', 'info', 'accent'];
    const nextPalette = { ...themeWithPalette.palette };

    keysToAugment.forEach((key) => {
      if (nextPalette[key]?.main) {
        nextPalette[key] = augment({ color: { main: nextPalette[key].main } });
        if (!nextPalette[key].contrastText) {
          nextPalette[key].contrastText = themeWithPalette.palette.getContrastText(
            nextPalette[key].main,
          );
        }
      }
    });

    return createTheme({ ...themeWithPalette, palette: nextPalette });
  }

  return themeWithPalette;
};

/** Outlined / contained actions for small confirm-style dialogs. */
export const confirmDialogSecondaryButtonSx = (theme) => ({
  width: { xs: '100%', sm: 'auto' },
  minWidth: { sm: 100 },
  py: 1.35,
  borderRadius: 2,
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.9375rem',
  borderColor: alpha(theme.palette.divider, 0.55),
  color: 'text.primary',
  bgcolor: alpha(theme.palette.action.hover, 0.04),
  backdropFilter: 'blur(8px)',
  '&:hover': {
    borderColor: alpha(theme.palette.divider, 0.85),
    bgcolor: alpha(theme.palette.action.hover, 0.1),
  },
});

export const confirmDialogPrimaryButtonSx = {
  width: { xs: '100%', sm: 'auto' },
  minWidth: { sm: 108 },
  py: 1.35,
  borderRadius: 2,
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.9375rem',
  boxShadow: 'none',
  '&:hover': { boxShadow: 'none' },
};

export const theme = buildTheme();
