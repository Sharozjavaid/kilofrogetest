"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Profile = {
  vibe: string;
  interests: string[];
  neighborhoods: string[];
  budget: string;
  when: string;
  crowdSize: string;
};

type Question =
  | {
      key: "vibe" | "budget" | "when" | "crowdSize";
      kind: "single";
      title: string;
      sub: string;
      options: string[];
    }
  | {
      key: "interests" | "neighborhoods";
      kind: "multi";
      title: string;
      sub: string;
      options: string[];
    };

const QUESTIONS: Question[] = [
  {
    key: "vibe",
    kind: "single",
    title: "What's your vibe?",
    sub: "Pick the one closest to how you want to feel.",
    options: ["Chill", "Social", "High-energy", "Artsy", "Nerdy"],
  },
  {
    key: "interests",
    kind: "multi",
    title: "What are you into?",
    sub: "Choose any number.",
    options: [
      "Tech",
      "Music",
      "Food & Drink",
      "Fitness",
      "Art",
      "Nightlife",
      "Outdoors",
      "Talks & Workshops",
      "Comedy",
      "Film",
    ],
  },
  {
    key: "neighborhoods",
    kind: "multi",
    title: "Where in the city?",
    sub: "Pick your turf — or just say Anywhere.",
    options: [
      "Mission",
      "SoMa",
      "Hayes Valley",
      "Marina",
      "Castro",
      "Richmond",
      "Sunset",
      "North Beach",
      "Dogpatch",
      "Anywhere",
    ],
  },
  {
    key: "budget",
    kind: "single",
    title: "Budget?",
    sub: "We won't judge.",
    options: ["Free only", "Under $25", "Under $75", "Money's no object"],
  },
  {
    key: "when",
    kind: "single",
    title: "When do you go out?",
    sub: "We'll match the calendar.",
    options: ["Weeknights", "Weekends", "Both"],
  },
  {
    key: "crowdSize",
    kind: "single",
    title: "Crowd size?",
    sub: "Some nights call for a few. Others, a flood.",
    options: [
      "Intimate (<30)",
      "Medium (30–150)",
      "Big (150+)",
      "No preference",
    ],
  },
];

const EMPTY: Profile = {
  vibe: "",
  interests: [],
  neighborhoods: [],
  budget: "",
  when: "",
  crowdSize: "",
};

export default function Home() {
  const router = useRouter();
  const [stepIdx, setStepIdx] = useState(-1);
  const [profile, setProfile] = useState<Profile>(EMPTY);
  const [animKey, setAnimKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const total = QUESTIONS.length;
  const question = stepIdx >= 0 ? QUESTIONS[stepIdx] : null;

  const isAnswered = useMemo(() => {
    if (!question) return false;
    if (question.kind === "single") return Boolean(profile[question.key]);
    return profile[question.key].length > 0;
  }, [question, profile]);

  function start() {
    setStepIdx(0);
    setAnimKey((k) => k + 1);
  }

  function goBack() {
    if (stepIdx <= 0) setStepIdx(-1);
    else setStepIdx((i) => i - 1);
    setAnimKey((k) => k + 1);
  }

  function goNext() {
    if (!isAnswered) return;
    if (stepIdx === total - 1) {
      finish();
      return;
    }
    setStepIdx((i) => i + 1);
    setAnimKey((k) => k + 1);
  }

  function finish() {
    setSubmitting(true);
    try {
      window.localStorage.setItem(
        "sf-events-profile",
        JSON.stringify(profile),
      );
    } catch {
      /* ignore */
    }
    router.push("/feed");
  }

  function pick(option: string) {
    if (!question) return;
    if (question.kind === "single") {
      setProfile((p) => ({ ...p, [question.key]: option }));
    } else {
      setProfile((p) => {
        const cur = p[question.key];
        const has = cur.includes(option);
        const next = has ? cur.filter((x) => x !== option) : [...cur, option];
        return { ...p, [question.key]: next };
      });
    }
  }

  const progress = stepIdx < 0 ? 0 : ((stepIdx + 1) / total) * 100;

  return (
    <div className="relative min-h-dvh w-full flex-1 bg-white text-black">
      {/* Top bar */}
      <header className="border-b border-line">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-5">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl italic tracking-tight">Foglight</span>
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
              v0.1
            </span>
          </div>
          <div className="font-mono text-[12px] uppercase tracking-[0.18em] text-muted">
            {stepIdx < 0 ? "Intro" : `${String(stepIdx + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`}
          </div>
        </div>
        {stepIdx >= 0 && (
          <div className="h-px w-full bg-line">
            <div
              className="h-px bg-black transition-[width] duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </header>

      {/* Main */}
      <main className="mx-auto flex w-full max-w-3xl flex-col px-6 py-6 sm:py-8">
        {stepIdx === -1 ? (
          <Intro key={animKey} onStart={start} />
        ) : (
          <StepCard
            key={animKey}
            q={question!}
            profile={profile}
            stepIdx={stepIdx}
            total={total}
            onPick={pick}
          />
        )}

        {stepIdx >= 0 && (
          <div className="mt-8 flex items-center justify-between border-t border-line pt-5">
            <button
              onClick={goBack}
              className="font-mono text-[13px] uppercase tracking-[0.18em] text-muted transition-colors hover:text-black"
            >
              ← Back
            </button>
            <button
              onClick={goNext}
              disabled={!isAnswered || submitting}
              className={`group inline-flex items-center gap-2 border px-6 py-4 font-mono text-[13px] uppercase tracking-[0.18em] transition-all ${
                isAnswered && !submitting
                  ? "border-black bg-black text-white hover:bg-white hover:text-black"
                  : "cursor-not-allowed border-line text-muted"
              }`}
            >
              {stepIdx === total - 1 ? "Find my events" : "Next"}
              <span
                aria-hidden
                className={`transition-transform ${
                  isAnswered ? "group-hover:translate-x-0.5" : ""
                }`}
              >
                →
              </span>
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          <span>San Francisco, CA</span>
          <span>Made for foggy nights</span>
        </div>
      </footer>
    </div>
  );
}

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <div className="step-enter">
      <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-muted">
        An events matcher for San Francisco
      </p>
      <h1 className="mt-4 text-7xl leading-[0.92] tracking-tight sm:text-8xl">
        Find your scene
        <br />
        <em className="font-normal">in the city.</em>
      </h1>
      <p className="mt-6 max-w-xl text-2xl leading-snug text-muted">
        Six questions. We&rsquo;ll surface the events worth showing up for —
        nothing else.
      </p>

      <div className="mt-8 flex items-center gap-4">
        <button
          onClick={onStart}
          className="group inline-flex items-center gap-2 border border-black bg-black px-7 py-4 font-mono text-[13px] uppercase tracking-[0.18em] text-white transition-colors hover:bg-white hover:text-black"
        >
          Start
          <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </button>
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
          ~ 45 seconds
        </span>
      </div>

      {/* Editorial detail */}
      <div className="mt-12 grid grid-cols-1 gap-5 border-t border-line pt-6 sm:grid-cols-3">
        <Detail num="01" label="Tell us your vibe" />
        <Detail num="02" label="We search the city" />
        <Detail num="03" label="You pick what to do" />
      </div>
    </div>
  );
}

function Detail({ num, label }: { num: string; label: string }) {
  return (
    <div>
      <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
        {num}
      </div>
      <div className="mt-2 text-2xl italic">{label}</div>
    </div>
  );
}

function StepCard({
  q,
  profile,
  stepIdx,
  total,
  onPick,
}: {
  q: Question;
  profile: Profile;
  stepIdx: number;
  total: number;
  onPick: (label: string) => void;
}) {
  const selected: string[] =
    q.kind === "single" ? [profile[q.key]].filter(Boolean) : profile[q.key];

  return (
    <section className="step-enter">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
        Question {String(stepIdx + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
        <span className="mx-2">·</span>
        {q.kind === "single" ? "Pick one" : "Pick any"}
      </div>
      <h2 className="mt-3 text-5xl leading-[1.02] tracking-tight sm:text-6xl">
        {q.title}
      </h2>
      <p className="mt-3 max-w-xl text-xl text-muted">{q.sub}</p>

      <div className="mt-6 grid grid-cols-1 gap-px bg-line border border-line sm:grid-cols-2">
        {q.options.map((opt) => {
          const active = selected.includes(opt);
          return (
            <button
              key={opt}
              onClick={() => onPick(opt)}
              className={`group flex items-center justify-between bg-white px-6 py-5 text-left text-2xl transition-colors ${
                active ? "bg-black text-white" : "hover:bg-neutral-50"
              }`}
              style={active ? { background: "#000" } : undefined}
            >
              <span className="flex items-baseline gap-4">
                <span
                  className={`font-mono text-[12px] uppercase tracking-[0.18em] ${
                    active ? "text-white/60" : "text-muted"
                  }`}
                >
                  {(q.options.indexOf(opt) + 1).toString().padStart(2, "0")}
                </span>
                <span className={active ? "italic" : ""}>{opt}</span>
              </span>
              <span
                aria-hidden
                className={`font-mono text-xs ${
                  active ? "opacity-100" : "opacity-0 group-hover:opacity-40"
                }`}
              >
                {active ? "✓" : "+"}
              </span>
            </button>
          );
        })}
      </div>

      {q.kind === "multi" && (
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
          {selected.length === 0
            ? "Tap as many as you like"
            : `${selected.length} selected`}
        </p>
      )}
    </section>
  );
}
