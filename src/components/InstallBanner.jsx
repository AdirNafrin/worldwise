import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/I18nContext';

const DISMISSED_KEY = 'worldwise:installBannerDismissed';
const FIRST_ROUND_DONE_KEY = 'worldwise:firstRoundDone';
const FIRST_ROUND_EVENT = 'worldwise:firstRoundDoneEvent';

export function markFirstRoundDone() {
  if (localStorage.getItem(FIRST_ROUND_DONE_KEY) !== '1') {
    localStorage.setItem(FIRST_ROUND_DONE_KEY, '1');
    window.dispatchEvent(new Event(FIRST_ROUND_EVENT));
  }
}

function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
  );
}

export function InstallBanner() {
  const { t } = useI18n();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === '1');
  const [firstRoundDone, setFirstRoundDone] = useState(
    () => localStorage.getItem(FIRST_ROUND_DONE_KEY) === '1',
  );

  useEffect(() => {
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

  const install = async () => {
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    dismiss();
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-slate-800">
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
