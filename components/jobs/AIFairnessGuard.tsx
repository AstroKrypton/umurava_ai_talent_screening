"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles } from "lucide-react";

type BiasDictionary = {
  gendered: string[];
  ageism: string[];
  toxicCulture: string[];
  ableism: string[];
  socioeconomic: string[];
  nationalityLanguage: string[];
  personalityAppearance: string[];
  lifestyleReligion: string[];
};

type BiasCategory = keyof BiasDictionary;

type BiasTerm = {
  word: string;
  category: BiasCategory;
};

type BiasMatch = BiasTerm & {
  detectedWord: string;
};

const BIAS_DICTIONARY: BiasDictionary = {
  gendered: [
    "man",
    "woman",
    "guy",
    "girl",
    "boys",
    "girls",
    "males",
    "females",
    "he",
    "she",
    "his",
    "hers",
    "him",
    "her",
    "chairman",
    "salesman",
    "policeman",
    "fireman",
    "foreman",
    "waitress",
    "stewardess",
    "hostess",
    "gentleman",
    "lady",
    "ladies",
    "guys",
    "brogrammer",
  ],
  ageism: [
    "young",
    "youthful",
    "fresh",
    "recent graduate",
    "digital native",
    "energetic",
    "high energy",
    "junior-only",
    "senior-only",
    "old",
    "mature",
    "overqualified",
    "early-career",
    "late-career",
  ],
  toxicCulture: [
    "ninja",
    "rockstar",
    "wizard",
    "guru",
    "hacker",
    "superhero",
    "beast mode",
    "crush it",
    "dominate",
    "killer instinct",
    "aggressive",
    "competitive culture",
    "work hard play hard",
    "fast-paced environment",
    "no excuses",
    "always on",
    "24/7",
  ],
  ableism: [
    "able-bodied",
    "physically fit",
    "healthy",
    "sane",
    "normal",
    "walk-in",
    "stand-up",
    "must lift",
    "must carry",
    "see clearly",
    "hear well",
    "speak clearly",
  ],
  socioeconomic: [
    "top university",
    "elite school",
    "ivy league",
    "prestigious university",
    "unpaid internship",
    "no gaps in employment",
  ],
  nationalityLanguage: [
    "native english speaker",
    "english as first language",
    "must be local",
    "locals only",
    "citizens only",
    "no foreigners",
  ],
  personalityAppearance: [
    "extrovert",
    "outgoing",
    "dominant",
    "assertive",
    "cultural fit",
    "must fit our culture",
    "strong personality",
    "good looking",
    "attractive",
    "well-groomed",
    "fit appearance",
  ],
  lifestyleReligion: [
    "must work weekends",
    "must work nights",
    "no family commitments",
    "single preferred",
    "christian",
    "muslim",
    "religious",
    "attend church",
  ],
};

const DEBOUNCE_DELAY_MS = 500;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function checkBias(text: string, terms: BiasTerm[]): BiasMatch | null {
  for (const term of terms) {
    const regex = new RegExp(`\\b${escapeRegExp(term.word)}\\b`, "i");
    const match = text.match(regex);
    if (match) {
      return { ...term, detectedWord: match[0] };
    }
  }

  return null;
}

type AIFairnessGuardProps = {
  value: string;
  onChange: (nextValue: string) => void;
  textareaClassName?: string;
} & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange" | "className">;

export function AIFairnessGuard({
  value,
  onChange,
  textareaClassName,
  rows = 6,
  placeholder,
  name,
  id,
  disabled,
  ...textareaProps
}: AIFairnessGuardProps) {
  const [status, setStatus] = useState<"idle" | "bias" | "clean">("idle");
  const [biasMatch, setBiasMatch] = useState<BiasMatch | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const biasTerms = useMemo(() => {
    return (Object.entries(BIAS_DICTIONARY) as Array<[BiasCategory, string[]]>).flatMap(([category, words]) =>
      words.map((word) => ({ word, category })),
    );
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const trimmed = value.trim();

    if (!trimmed) {
      setStatus("idle");
      setBiasMatch(null);
      return;
    }

    debounceRef.current = setTimeout(() => {
      const match = checkBias(trimmed, biasTerms);
      if (match) {
        setStatus("bias");
        setBiasMatch(match);
      } else {
        setStatus("clean");
        setBiasMatch(null);
      }
    }, DEBOUNCE_DELAY_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [value, biasTerms]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const textareaClasses = [
    "min-h-32 w-full rounded-3xl border border-white/80 bg-white/80 px-4 py-4 text-sm leading-6 text-slate-700 outline-none transition focus:border-[#0B4F8A] focus:bg-white focus:ring-2 focus:ring-[#0B4F8A]/15",
    textareaClassName,
  ]
    .filter(Boolean)
    .join(" ");

  const statusTextClass =
    status === "bias" ? "text-[#E11D48]" : status === "clean" ? "text-[#1A8C4E]" : "text-slate-600";

  return (
    <div className="space-y-3">
      <textarea
        id={id}
        name={name}
        disabled={disabled}
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={textareaClasses}
        {...textareaProps}
      />

      <div className="bg-white/40 backdrop-blur-2xl border border-white/40 rounded-2xl p-4">
        <div aria-live="polite" className={`flex items-center gap-3 text-sm ${statusTextClass}`}>
          {status === "idle" ? (
            <>
              <Sparkles aria-hidden="true" className="h-4 w-4 text-[#4C57B6]" />
              <span>Start typing and we&apos;ll flag biased wording automatically.</span>
            </>
          ) : status === "bias" ? (
            <span>
              ⚠️ Potential bias: &lsquo;{biasMatch?.detectedWord}&rsquo; might be non-inclusive. Try a more neutral term.
            </span>
          ) : (
            <span>✅ Fairness Check Passed: Language is inclusive and professional.</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default AIFairnessGuard;
