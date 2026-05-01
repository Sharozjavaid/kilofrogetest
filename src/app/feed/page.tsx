"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Profile = {
  vibe: string;
  interests: string[];
  neighborhoods: string[];
  budget: string;
  when: string;
  crowdSize: string;
};

const STAGES = [
  "Reading the fog",
  "Scanning Eventbrite, Luma, Dice",
  "Cross-referencing your vibe",
  "Filtering by neighborhood",
  "Ranking by what you'll love",
  "Almost there",
];

export default function FeedPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stageIdx, setStageIdx] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("sf-events-profile");
      if (raw) setProfile(JSON.parse(raw) as Profile);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setStageIdx((i) => (i + 1) % STAGES.length);
    }, 1600);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 80);
    return () => clearInterval(id);
  }, []);

  const stage = STAGES[stageIdx];

  // Build a marquee of profile tags
  const tags: string[] = profile
    ? [
        profile.vibe,
        ...profile.interests,
        ...profile.neighborhoods,
        profile.budget,
        profile.when,
        profile.crowdSize,
      ].filter(Boolean)
    : [];

  return (
    <div className="min-h-dvh flex-1 bg-white text-black">
      <header className="border-b border-line">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-2xl italic tracking-tight">
            Foglight
          </Link>
          <Link
            href="/"
            className="font-mono text-[12px] uppercase tracking-[0.18em] text-muted transition-colors hover:text-black"
          >
            ← Restart
          </Link>
        </div>
        <div className="h-px w-full overflow-hidden bg-line">
          <div className="loader-bar h-px bg-black" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 py-10">
        <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-muted">
          <span className="inline-block h-2 w-2 translate-y-[-1px] mr-2 animate-pulse rounded-full bg-black align-middle" />
          Searching the city · {String(stageIdx + 1).padStart(2, "0")} / {String(STAGES.length).padStart(2, "0")}
        </p>

        <h1 className="mt-4 text-7xl leading-[0.92] tracking-tight sm:text-8xl">
          Finding your <em className="font-normal">scene<span className="dots" /></em>
        </h1>

        {/* Stage line */}
        <div key={stageIdx} className="step-enter mt-8 flex items-baseline gap-3">
          <span className="font-mono text-[12px] uppercase tracking-[0.22em] text-muted">
            Now
          </span>
          <span className="text-2xl italic">{stage}</span>
        </div>

        {/* Animated radar / scanner */}
        <div className="relative mt-10 aspect-[2/1] w-full overflow-hidden border border-line bg-white">
          <Radar tick={tick} />
        </div>

        {/* Profile tags marquee */}
        {tags.length > 0 && (
          <div className="mt-8 overflow-hidden border-y border-line py-4">
            <div className="marquee flex gap-6 whitespace-nowrap">
              {[...tags, ...tags, ...tags].map((t, i) => (
                <span
                  key={i}
                  className="font-mono text-[13px] uppercase tracking-[0.18em] text-muted"
                >
                  {t}
                  <span className="ml-6 opacity-40">·</span>
                </span>
              ))}
            </div>
          </div>
        )}

        <p className="mt-10 max-w-xl text-xl text-muted">
          We&rsquo;re reading the fog. Hang tight — your matches are
          materializing.
        </p>
      </main>
    </div>
  );
}

function Radar({ tick }: { tick: number }) {
  // Deterministic pseudo-random pings derived from tick
  const W = 800;
  const H = 400;
  const cx = W / 2;
  const cy = H;
  const angle = (tick * 1.2) % 360; // sweep
  const radians = (angle * Math.PI) / 180 - Math.PI; // sweep upward 180°
  const lineX = cx + Math.cos(radians) * H * 1.2;
  const lineY = cy + Math.sin(radians) * H * 1.2;

  // Static dot field
  const dots = [];
  for (let i = 0; i < 38; i++) {
    const a = ((i * 47) % 180) - 90; // -90 to 90
    const r = 60 + ((i * 53) % (H - 80));
    const x = cx + Math.sin((a * Math.PI) / 180) * r;
    const y = cy - Math.cos((a * Math.PI) / 180) * r;
    const phase = (tick + i * 9) % 80;
    const lit = phase < 12;
    dots.push({ x, y, lit, key: i });
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="absolute inset-0 h-full w-full"
    >
      {/* Concentric arcs */}
      {[80, 160, 240, 320, 400].map((r) => (
        <path
          key={r}
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          stroke="#e5e5e5"
          strokeWidth="1"
          fill="none"
        />
      ))}
      {/* Crosshair */}
      <line x1={0} y1={cy} x2={W} y2={cy} stroke="#e5e5e5" />
      <line x1={cx} y1={0} x2={cx} y2={cy} stroke="#e5e5e5" />

      {/* Sweep line */}
      <line
        x1={cx}
        y1={cy}
        x2={lineX}
        y2={lineY}
        stroke="#000"
        strokeWidth="1.2"
      />

      {/* Dots */}
      {dots.map((d) => (
        <circle
          key={d.key}
          cx={d.x}
          cy={d.y}
          r={d.lit ? 4 : 2}
          fill={d.lit ? "#000" : "#bbb"}
        />
      ))}

      {/* Center node */}
      <circle cx={cx} cy={cy} r={5} fill="#000" />
      <text
        x={cx}
        y={cy - 14}
        textAnchor="middle"
        fontFamily="ui-monospace, monospace"
        fontSize="11"
        fill="#000"
        letterSpacing="2"
      >
        SF
      </text>
    </svg>
  );
}
