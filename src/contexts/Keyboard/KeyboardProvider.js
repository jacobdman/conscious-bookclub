import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import KeyboardContext from './KeyboardContext';

/** Pixels of overlap between layout height and visual viewport; treat as keyboard (avoids toolbar noise). */
const WEB_KEYBOARD_VISIBLE_THRESHOLD_PX = 80;

function readVisualViewportKeyboardInset() {
  const vv = window.visualViewport;
  if (!vv) return 0;
  return Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
}

/**
 * Keyboard visibility (native + mobile web) and bottom inset in px for fixed fullscreen UI
 * (MUI Dialog Modal root) above the software keyboard.
 */
const KeyboardProvider = (props) => {
  const children = props?.children;
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardInsetPx, setKeyboardInsetPx] = useState(0);

  const applyWebVisualViewport = useCallback(() => {
    const inset = readVisualViewportKeyboardInset();
    setKeyboardInsetPx(inset);
    setKeyboardVisible(inset >= WEB_KEYBOARD_VISIBLE_THRESHOLD_PX);
  }, []);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // With KeyboardResize.Native the WebView already shrinks; do not add JS bottom inset (avoids double shrink).
      const showListener = Keyboard.addListener('keyboardWillShow', () => {
        setKeyboardVisible(true);
        setKeyboardInsetPx(0);
      });
      const hideListener = Keyboard.addListener('keyboardWillHide', () => {
        setKeyboardVisible(false);
        setKeyboardInsetPx(0);
      });

      return () => {
        showListener.then((l) => l.remove());
        hideListener.then((l) => l.remove());
      };
    }

    const vv = window.visualViewport;
    if (!vv) return undefined;

    vv.addEventListener('resize', applyWebVisualViewport);
    vv.addEventListener('scroll', applyWebVisualViewport);
    applyWebVisualViewport();

    return () => {
      vv.removeEventListener('resize', applyWebVisualViewport);
      vv.removeEventListener('scroll', applyWebVisualViewport);
    };
  }, [applyWebVisualViewport]);

  return (
    <KeyboardContext.Provider value={{ keyboardVisible, keyboardInsetPx }}>
      {children}
    </KeyboardContext.Provider>
  );
};

export const useKeyboardContext = () => useContext(KeyboardContext);
export default KeyboardProvider;
