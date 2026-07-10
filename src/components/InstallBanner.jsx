import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/I18nContext';

const DISMISSED_KEY = 'worldwise:installBannerDismissed';
const FIRST_ROUND_DONE_KEY = 'worldwise:firstRoundDone';
const FIRST_ROUND_EVENT = 'worldwise:firstRoundDoneEvent';

// Called by Results.jsx once a round finishes. Per the spec, the install
// banner should only appear after the player's first completed round, not
// immediately on their very first visit. Flags that milestone in
// localStorage (so it stays true forever) and fires a same-tab event, since
// the browser's own 'storage' event doesn't fire in the tab that made the change.
export function markFirstRoundDone() {
  if (localStorage.getItem(FIRST_ROUND_DONE_KEY) !== '1') {
    localStorage.setItem(FIRST_ROUND_DONE_KEY, '1');
    window.dispatchEvent(new Event(FIRST_ROUND_EVENT));
  }
}

// True once the app is already running as an installed PWA (opened from a
// home-screen icon rather than a browser tab) - in which case there's
// nothing left to prompt the user to install.
function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
  );
}

// Custom, dismissible "install this app" banner. Chrome/Android fires a
// `beforeinstallprompt` event instead of showing its own UI immediately;
// this component captures that event, holds onto it, and only shows the
// banner once all of these are true: the browser actually offered to
// install, the player finished a round, they haven't dismissed it before,
// and the app isn't already installed.
export function InstallBanner() {
  const { t } = useI18n();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === '1');
  const [firstRoundDone, setFirstRoundDone] = useState(
    () => localStorage.getItem(FIRST_ROUND_DONE_KEY) === '1',
  );

  useEffect(() => {
    // Stop the browser from showing its own install prompt immediately;
    // we save the event and trigger it ourselves from our own button.
    const onPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);

    const onFirstRoundDone = () => setFirstRoundDone(true);
    window.addEventListener(FIRST_ROUND_EVENT, onFirstRoundDone);

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener(FIRST_ROUND_EVENT, onFirstRoundDone);
    };
  }, []);

  if (!deferredPrompt || dismissed || !firstRoundDone || isStandalone()) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setDismissed(true);
  };

  // Replays the captured browser install prompt on demand (from our own
  // "Install" button) and remembers the outcome so we don't ask again.
  const install = async () => {
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    dismiss();
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-slate-800"
      style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
    >
      <div className="mx-auto flex max-w-lg items-center gap-3">
        <div className="flex-1">
          <p className="font-semibold">{t('home.installTitle')}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('home.installBody')}</p>
        </div>
        <button
          onClick={dismiss}
          className="rounded-full px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
        >
          {t('home.installDismiss')}
        </button>
        <button
          onClick={install}
          className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {t('home.installAction')}
        </button>
      </div>
    </div>
  );
}
