import { useState, useEffect, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface Window {
    __deferredPwaPrompt?: BeforeInstallPromptEvent | null;
  }
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
    appinstalled: Event;
    'pwa-prompt-ready': CustomEvent<BeforeInstallPromptEvent>;
  }
}

const STORAGE_DISMISSED_KEY = 'pacific_pwa_prompt_dismissed_until';

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    if (typeof window !== 'undefined' && window.__deferredPwaPrompt) {
      return window.__deferredPwaPrompt;
    }
    return null;
  });

  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    );
  });

  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isAndroid, setIsAndroid] = useState<boolean>(false);
  const [isWindows, setIsWindows] = useState<boolean>(false);

  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    try {
      const until = localStorage.getItem(STORAGE_DISMISSED_KEY);
      if (until && Number(until) > Date.now()) {
        return true;
      }
    } catch {}
    return false;
  });

  const [showInstallModal, setShowInstallModal] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ua = window.navigator.userAgent.toLowerCase();
    const isApple = /iphone|ipad|ipod/.test(ua) && !(window as any).MSStream;
    const isDroid = /android/.test(ua);
    const isWin = /windows|win32|win64/.test(ua);

    setIsIOS(isApple);
    setIsAndroid(isDroid);
    setIsWindows(isWin);

    // Check if early prompt already exists
    if (window.__deferredPwaPrompt) {
      setDeferredPrompt(window.__deferredPwaPrompt);
    }

    // Display mode change listener
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayChange = (e: MediaQueryListEvent) => {
      setIsInstalled(e.matches);
    };
    mediaQuery.addEventListener('change', handleDisplayChange);

    // Capture standard beforeinstallprompt
    const handleBeforeInstall = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      window.__deferredPwaPrompt = e;
      setDeferredPrompt(e);
      console.log('[PWA Hook] beforeinstallprompt event captured and ready.');
    };

    // Capture custom event from early HTML script
    const handleCustomPromptReady = (e: CustomEvent<BeforeInstallPromptEvent>) => {
      if (e.detail) {
        window.__deferredPwaPrompt = e.detail;
        setDeferredPrompt(e.detail);
      }
    };

    // Installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      window.__deferredPwaPrompt = null;
      setShowInstallModal(false);
      console.log('[PWA Hook] Pacific Admin app installed on device.');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('pwa-prompt-ready', handleCustomPromptReady as EventListener);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      mediaQuery.removeEventListener('change', handleDisplayChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('pwa-prompt-ready', handleCustomPromptReady as EventListener);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'modal_opened'> => {
    const prompt = deferredPrompt || window.__deferredPwaPrompt;

    if (isIOS) {
      setShowInstallModal(true);
      return 'modal_opened';
    }

    if (!prompt) {
      // If native deferred prompt is not yet available, show the helper guide modal
      setShowInstallModal(true);
      return 'modal_opened';
    }

    try {
      await prompt.prompt();
      const choiceResult = await prompt.userChoice;
      console.log('[PWA] User response to install prompt:', choiceResult.outcome);

      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        window.__deferredPwaPrompt = null;
        setShowInstallModal(false);
      }
      return choiceResult.outcome;
    } catch (err) {
      console.warn('[PWA] Error calling prompt():', err);
      setShowInstallModal(true);
      return 'modal_opened';
    }
  }, [deferredPrompt, isIOS]);

  const dismissPrompt = useCallback((hours = 48) => {
    setIsDismissed(true);
    try {
      const expiry = Date.now() + hours * 60 * 60 * 1000;
      localStorage.setItem(STORAGE_DISMISSED_KEY, String(expiry));
    } catch {}
  }, []);

  return {
    isInstallable: !!(deferredPrompt || (typeof window !== 'undefined' && window.__deferredPwaPrompt)) || isIOS,
    canPromptDirectly: !!(deferredPrompt || (typeof window !== 'undefined' && window.__deferredPwaPrompt)),
    isInstalled,
    isIOS,
    isAndroid,
    isWindows,
    isDismissed,
    showInstallModal,
    setShowInstallModal,
    promptInstall,
    dismissPrompt,
  };
}
