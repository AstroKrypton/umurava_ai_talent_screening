"use client";

import { useEffect, useMemo, useState } from "react";

type DetailedProgressBarProps = {
  label: string;
  value: number;
  max?: number;
  showValue?: boolean;
  className?: string;
  durationMs?: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const easeOutCubic = (value: number) => 1 - Math.pow(1 - value, 3);

export function DetailedProgressBar({
  label,
  value,
  max = 100,
  showValue = true,
  className,
  durationMs = 1200,
}: DetailedProgressBarProps) {
  const [animatedPercent, setAnimatedPercent] = useState(0);
  const [animatedValue, setAnimatedValue] = useState(0);

  const safeMax = Math.max(max, 1);
  const boundedValue = clamp(value, 0, safeMax);
  const displayPercent = Math.round((boundedValue / safeMax) * 100);
  const labelContent = useMemo(() => label, [label]);

  useEffect(() => {
    let frameId: number;
    const duration = Math.max(durationMs, 200);
    const startValue = 0;
    const targetValue = boundedValue;
    const targetPercent = (boundedValue / safeMax) * 100;
    const startedAt = performance.now();

    setAnimatedValue(0);
    setAnimatedPercent(0);

    const animate = (timestamp: number) => {
      const elapsed = timestamp - startedAt;
      const progress = clamp(elapsed / duration, 0, 1);
      const eased = easeOutCubic(progress);
      const currentValue = startValue + (targetValue - startValue) * eased;
      const currentPercent = startValue + (targetPercent - startValue) * eased;

      setAnimatedValue(currentValue);
      setAnimatedPercent(currentPercent);

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    };

    frameId = requestAnimationFrame(animate);

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [boundedValue, safeMax, durationMs]);

  const containerClass = [
    "flex items-center gap-4",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={containerClass}>
      <span className="min-w-[8rem] shrink-0 text-sm font-semibold text-slate-900">
        {labelContent}
      </span>
      <div className="relative flex-1">
        <div className="relative h-2 overflow-hidden rounded-full bg-slate-200/40">
          <div
            className="absolute inset-y-0 left-0 h-full rounded-full bg-[#1A8C4E] shadow-[0_0_0_1px_rgba(26,140,78,0.25)] transition-[width] duration-200"
            style={{ width: `${animatedPercent}%` }}
          />
          <div className="absolute inset-0 rounded-full border border-white/30" aria-hidden="true" />
        </div>
      </div>
      {showValue ? (
        <span className="w-12 shrink-0 text-right text-sm font-semibold text-slate-900">
          {`${displayPercent}%`}
        </span>
      ) : null}
    </div>
  );
}

export default DetailedProgressBar;
