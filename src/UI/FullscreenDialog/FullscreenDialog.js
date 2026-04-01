import { forwardRef, useEffect, useMemo } from 'react';
import { Dialog } from '@mui/material';
// Context
import { useKeyboardContext } from 'contexts/Keyboard';
// Utils
import { getPlatform } from 'utils/platformHelpers';
import { scrollFieldIntoView, isTextInputElement } from 'utils/scrollFieldIntoView';

// Must exceed the native WebView resize animation duration (0.25s in patches/@capacitor+keyboard+8.0.1.patch).
const KEYBOARD_RESIZE_SCROLL_DELAY_MS = 300;

/**
 * Fullscreen MUI Dialog that can offset its Modal root above the software keyboard.
 * On Capacitor with KeyboardResize.Native, keyboardInsetPx stays 0 (WebView handles height).
 * On web/PWA, visualViewport drives keyboardInsetPx (e.g. KeyboardResize.Body or Safari).
 * When `fullScreen` is false, behaves like a normal Dialog (no bottom offset).
 *
 * Native WebView resize is instant (OS-controlled); smooth `bottom` transitions only apply
 * when keyboardInsetPx changes on the PWA/visual-viewport path—not for KeyboardResize.Native.
 */
const FullscreenDialog = forwardRef(function FullscreenDialog(
  {
    slotProps: slotPropsProp,
    PaperProps: paperPropsProp,
    fullScreen = true,
    open,
    disableScrollLock: disableScrollLockProp,
    ...rest
  },
  ref,
) {
  const { keyboardInsetPx, keyboardVisible } = useKeyboardContext();
  const isFullscreen = Boolean(fullScreen);

  // Scroll focused input into view after the native WebView resize animation finishes.
  // keyboardWillShow fires at animation start; delay until resize completes (see KEYBOARD_RESIZE_SCROLL_DELAY_MS).
  useEffect(() => {
    if (!open || !isFullscreen || !keyboardVisible) return;
    const el = document.activeElement;
    if (!el || !isTextInputElement(el) || !el.closest('[role="dialog"]')) return;
    const timeoutId = setTimeout(() => {
      scrollFieldIntoView(el);
    }, KEYBOARD_RESIZE_SCROLL_DELAY_MS);
    return () => clearTimeout(timeoutId);
  }, [open, isFullscreen, keyboardVisible]);

  const { mergedPaperProps, mergedSlotPropsWithoutPaper } = useMemo(() => {
    const { paper: userPaperSlot, ...restSlots } = slotPropsProp || {};
    const basePaper = {
      ...paperPropsProp,
      ...userPaperSlot,
    };
    const prevCapture = (event) => {
      paperPropsProp?.onFocusCapture?.(event);
      userPaperSlot?.onFocusCapture?.(event);
    };
    return {
      mergedPaperProps: {
        ...basePaper,
        onFocusCapture: (event) => prevCapture(event),
      },
      mergedSlotPropsWithoutPaper: restSlots,
    };
  }, [slotPropsProp, paperPropsProp]);

  const rootSlot = mergedSlotPropsWithoutPaper?.root;
  const mergedSlotProps = {
    ...mergedSlotPropsWithoutPaper,
    root: {
      ...rootSlot,
      sx: [
        rootSlot?.sx,
        isFullscreen && {
          bottom: keyboardInsetPx,
          transition: (theme) =>
            theme.transitions.create('bottom', {
              duration: 280,
              easing: theme.transitions.easing.easeOut,
            }),
        },
      ],
    },
  };

  // Capacitor WKWebView: MUI body scroll-lock + nested overflow often eats touch scrolling; PWA Safari is fine.
  const disableScrollLock = disableScrollLockProp ?? getPlatform() === 'ios';

  return (
    <Dialog
      ref={ref}
      open={open}
      fullScreen={fullScreen}
      PaperProps={mergedPaperProps}
      slotProps={mergedSlotProps}
      disableScrollLock={disableScrollLock}
      {...rest}
    />
  );
});

export default FullscreenDialog;
