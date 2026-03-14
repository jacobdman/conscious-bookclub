import React, { useState, useEffect, useContext } from 'react';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import KeyboardContext from './KeyboardContext';

/**
 * Provides keyboard visibility state on Capacitor native (iOS/Android)
 * so UI (e.g. bottom nav) can hide when the keyboard is open.
 */
const KeyboardProvider = (props) => {
  const children = props?.children;
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const showListener = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideListener = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));

    return () => {
      showListener.then((l) => l.remove());
      hideListener.then((l) => l.remove());
    };
  }, []);

  return (
    <KeyboardContext.Provider value={{ keyboardVisible }}>
      {children}
    </KeyboardContext.Provider>
  );
};

export const useKeyboardContext = () => useContext(KeyboardContext);
export default KeyboardProvider;
