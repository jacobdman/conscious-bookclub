import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

/**
 * Listens for Android hardware back button and navigates within the app
 * instead of closing it. Only active when running as Capacitor native app.
 */
const BackButtonHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listenerPromise = App.addListener('backButton', () => {
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        App.exitApp();
      }
    });

    return () => {
      listenerPromise.then((l) => l.remove());
    };
  }, [navigate]);

  return null;
};

export default BackButtonHandler;
