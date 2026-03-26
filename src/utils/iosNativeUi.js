import { alpha } from '@mui/material/styles';
import { getPlatform } from 'utils/platformHelpers';

export const isIosNativeApp = () => getPlatform() === 'ios';

/** SwipeableDrawer Paper `sx` merge for iOS-style bottom sheets. */
export const iosBottomSheetPaperSx = (theme) => ({
  borderTopLeftRadius: 16,
  borderTopRightRadius: 16,
  transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
  backgroundColor: alpha(theme.palette.background.paper, 0.92),
  backdropFilter: 'saturate(180%) blur(24px)',
  WebkitBackdropFilter: 'saturate(180%) blur(24px)',
});

export const iosSheetGrabberSx = {
  width: 36,
  height: 5,
  backgroundColor: 'rgba(60, 60, 67, 0.3)',
  borderRadius: 2.5,
};
