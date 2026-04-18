"use client";

import { useEffect, useMemo, useState } from "react";

type OverallScoreGaugeProps = {
  score: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
};

const easeOutCubic = (value: number) => 1 - Math.pow(1 - value, 3);

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const resolveAccentColor = (value: number) => {
  if (value < 50) return "#DC2626";
  if (value <= 70) return "#A16207";
  return "#1A8C4E";
};

export function OverallScoreGauge({
  score,
  size = 164,
  strokeWidth = 16,
  className,
}: OverallScoreGaugeProps) {
  const [animatedPercent, setAnimatedPercent] = useState(0);
  const [animatedScore, setAnimatedScore] = useState(0);

  const boundedScore = clamp(score, 0, 100);
  const accentColor = useMemo(
    () => resolveAccentColor(boundedScore),
    [boundedScore],
  );

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    let frameId: number;
    const duration = 1500;
    const startValue = 0;
    const target = boundedScore;
    const startedAt = performance.now();

    setAnimatedPercent(0);
    setAnimatedScore(0);

    const animate = (timestamp: number) => {
      const elapsed = timestamp - startedAt;
      const progress = clamp(elapsed / duration, 0, 1);
      const eased = easeOutCubic(progress);
      const currentValue = startValue + (target - startValue) * eased;

      setAnimatedPercent(currentValue);
      setAnimatedScore(currentValue);

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    };

    frameId = requestAnimationFrame(animate);

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [boundedScore]);

  const strokeDashoffset = circumference * (1 - animatedPercent / 100);
  const containerClass = [
    "relative flex h-44 w-44 items-center justify-center overflow-hidden rounded-[3rem] bg-white/40 p-6 text-center backdrop-blur-3xl shadow-[0_30px_80px_rgba(15,138,95,0.12)]",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={containerClass}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0"
        role="presentation"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(148, 163, 184, 0.22)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={accentColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          fill="none"
          className="transition-colors"
        />
      </svg>
      <div className="relative z-10 flex flex-col items-center justify-center">
        <span className="text-5xl font-semibold text-slate-900">
          {Math.round(animatedScore)}
        </span>
        <span className="mt-2 text-xs font-semibold tracking-[0.4em] text-slate-500">
          overall
        </span>
      </div>
    </div>
  );
}

export default OverallScoreGauge;
