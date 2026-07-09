export function TimerBar({ percent, remainingSeconds }) {
  const isLow = percent < 30;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className={`h-full rounded-full transition-[width] duration-200 ease-linear ${isLow ? 'bg-red-500' : 'bg-blue-500'}`}
          style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
        />
      </div>
      <span className="w-6 text-end text-sm tabular-nums text-slate-500 dark:text-slate-400">
        {remainingSeconds}
      </span>
    </div>
  );
}
