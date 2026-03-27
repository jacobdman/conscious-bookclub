import { alpha } from '@mui/material/styles';

/** Backdrop for liquid-glass dialogs (default shell for IOSConfirmDialog and similar). */
export const liquidGlassBackdropSx = (theme) => ({
  backgroundColor:
    theme.palette.mode === 'dark'
      ? alpha(theme.palette.common.black, 0.48)
      : alpha(theme.palette.common.black, 0.22),
  backdropFilter: 'blur(28px) saturate(175%)',
  WebkitBackdropFilter: 'blur(28px) saturate(175%)',
});

/** Frosted panel for liquid-glass dialogs. */
export const liquidGlassPaperSx = (theme) => {
  const isDark = theme.palette.mode === 'dark';
  return {
    width: '100%',
    maxWidth: 380,
    borderRadius: 3,
    overflow: 'hidden',
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
  };
};

/** Centered Modal root: flex + safe-area padding. */
export const liquidGlassModalContainerSx = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  pl: 'max(20px, env(safe-area-inset-left, 0px))',
  pr: 'max(20px, env(safe-area-inset-right, 0px))',
  py: 2.5,
  pt: 'max(20px, env(safe-area-inset-top, 0px))',
  pb: 'max(20px, env(safe-area-inset-bottom, 0px))',
  outline: 0,
};

/** Secondary/cancel action — matches IOSConfirmDialog outlined control. */
export const liquidGlassSecondaryButtonSx = (theme) => ({
  width: { xs: '100%', sm: 'auto' },
  minWidth: { sm: 100 },
  py: 1.1,
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

/** Primary confirm action — matches IOSConfirmDialog contained control. */
export const liquidGlassPrimaryButtonSx = {
  width: { xs: '100%', sm: 'auto' },
  minWidth: { sm: 108 },
  py: 1.1,
  borderRadius: 2,
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.9375rem',
  boxShadow: 'none',
  '&:hover': { boxShadow: 'none' },
};
