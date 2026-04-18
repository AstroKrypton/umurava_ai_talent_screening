'use client';

import { useEffect, useRef, useState } from "react";

interface AnimatedCounterProps {
  target: number;
  prefix?: string;
  suffix?: string;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export function AnimatedCounter({ target, prefix = "", suffix = "" }: AnimatedCounterProps) {
  const spanRef = useRef<HTMLSpanElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const hasAnimatedRef = useRef(false);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const node = spanRef.current;
    if (!node) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimatedRef.current) {
            hasAnimatedRef.current = true;
            const start = performance.now();
            const duration = 2000;

            const animate = (timestamp: number) => {
              const elapsed = timestamp - start;
              const progress = Math.min(1, elapsed / duration);
              const eased = easeOutCubic(progress);
              setDisplayValue(Math.round(target * eased));

              if (progress < 1) {
                frameRef.current = requestAnimationFrame(animate);
              } else {
                frameRef.current = null;
              }
            };

            frameRef.current = requestAnimationFrame(animate);
          }
        });
      },
      { threshold: 0.35 }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [target]);

  useEffect(() => {
    setDisplayValue(0);
    hasAnimatedRef.current = false;
  }, [target]);

  return (
    <span ref={spanRef} className="tabular-nums">
      {prefix}
      {displayValue}
      {suffix}
    </span>
  );
}
