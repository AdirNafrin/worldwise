const STYLES = {
  idle: 'border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700',
  correct: 'border-green-500 bg-green-50 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  incorrect: 'border-red-500 bg-red-50 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  revealCorrect: 'border-green-500 border-dashed bg-white dark:bg-slate-800',
  muted: 'border-slate-200 bg-white opacity-50 dark:border-slate-700 dark:bg-slate-800',
};

function CheckIcon() {
  return (
    <svg className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AnswerButton({ status = 'idle', onClick, disabled, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-16 w-full items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3 text-start font-medium transition-colors ${STYLES[status]}`}
    >
      <span className="flex-1">{children}</span>
      {status === 'correct' && <CheckIcon />}
      {status === 'incorrect' && <CrossIcon />}
      {status === 'revealCorrect' && <CheckIcon />}
    </button>
  );
}
