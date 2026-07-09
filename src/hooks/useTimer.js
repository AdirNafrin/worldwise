import { useEffect, useRef, useState } from 'react';

// Counts down from `durationSeconds`, calling onExpire once when it hits 0.
// Pass a new `resetKey` to restart the timer (e.g. per question). Pass
// durationSeconds = null to disable the timer entirely (practice mode).
export function useTimer(durationSeconds, resetKey, onExpire) {
  const [remainingMs, setRemainingMs] = useState((durationSeconds ?? 0) * 1000);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (durationSeconds == null) return;
    const total = durationSeconds * 1000;
    const start = performance.now();
    setRemainingMs(total);

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
  }, [durationSeconds, resetKey]);

  const percent = durationSeconds ? (remainingMs / (durationSeconds * 1000)) * 100 : 100;
  return { remainingSeconds: Math.ceil(remainingMs / 1000), percent };
}
