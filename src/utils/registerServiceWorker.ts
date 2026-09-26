/**
 * Registers the Service Worker for Progressive Web App (PWA) installation and offline caching.
 */
export function registerPwaServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  const doRegister = () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(() => {})
      .catch(() => {});
  };

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    doRegister();
  } else {
    window.addEventListener('load', doRegister);
  }
}
