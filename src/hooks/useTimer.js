import { useEffect, useRef, useState } from 'react';

// Counts down from `durationSeconds`, calling onExpire once when it hits 0.
// Pass a new `resetKey` to restart the timer (e.g. per question). Pass
// durationSeconds = null to disable the timer entirely (practice mode).
export function useTimer(durationSeconds, resetKey, onExpire) {
  const [remainingMs, setRemainingMs] = useState((durationSeconds ?? 0) * 1000);

  // Keep the latest onExpire in a ref rather than a effect dependency, so
  // the running countdown loop always calls the current callback without
  // needing to restart (and thus reset the timer) every time the parent
  // re-renders with a new inline function.
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (durationSeconds == null) return; // timer disabled (practice mode)
    const total = durationSeconds * 1000;
    const start = performance.now();
    setRemainingMs(total);

    // requestAnimationFrame loop (instead of setInterval) so the progress
    // bar updates smoothly and stays accurate even if the tab was briefly
    // throttled in the background.
    let frame;
    const tick = (now) => {
      const elapsed = now - start;
      const remaining = Math.max(0, total - elapsed);
      setRemainingMs(remaining);
      if (remaining <= 0) {
        onExpireRef.current?.();
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durationSeconds, resetKey]); // resetKey (e.g. question index) restarts the countdown

  const percent = durationSeconds ? (remainingMs / (durationSeconds * 1000)) * 100 : 100;
  return { remainingSeconds: Math.ceil(remainingMs / 1000), percent };
}
