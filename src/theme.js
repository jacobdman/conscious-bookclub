import { createTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';

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
    fontFamily: 'Georgia, serif',
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
  const theme = createTheme({ ...baseThemeOptions, components: componentOverrides }, overrides || {});
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

export const theme = buildTheme();
