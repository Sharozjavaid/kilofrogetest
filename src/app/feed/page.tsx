"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

const EventsMap = dynamic(() => import("./EventsMap"), { ssr: false });

type Profile = {
  vibe: string;
  interests: string[];
  neighborhoods: string[];
  budget: string;
  when: string;
  crowdSize: string;
};

type EventCard = {
  title: string;
  datetime_iso: string;
  venue: string;
  neighborhood: string;
  price: string;
  url: string;
  description: string;
  tags: string[];
  why_it_matches: string;
  lat?: number;
  lng?: number;
};

const STAGES = [
  "Reading the fog",
  "Scanning Eventbrite, Luma, Dice",
  "Cross-referencing your vibe",
  "Filtering by neighborhood",
  "Ranking by what you'll love",
  "Almost there",
];

function profileToOnboarding(p: Profile) {
  return [
    { q: "What's your vibe?", a: p.vibe || "no preference" },
    { q: "What are you into?", a: p.interests.join(", ") || "open to anything" },
    { q: "Where in the city?", a: p.neighborhoods.join(", ") || "Anywhere in SF" },
    { q: "Budget?", a: p.budget || "no preference" },
    { q: "When do you go out?", a: p.when || "either" },
    { q: "Crowd size?", a: p.crowdSize || "no preference" },
  ];
}

function defaultDateRange(): string {
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + 7);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  return `${fmt(now)} – ${fmt(end)}, ${end.getFullYear()}`;
}

export default function FeedPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stageIdx, setStageIdx] = useState(0);
  const [tick, setTick] = useState(0);
  const [events, setEvents] = useState<EventCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("sf-events-profile");
      if (raw) setProfile(JSON.parse(raw) as Profile);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dateRange: defaultDateRange(),
            onboarding: profileToOnboarding(profile),
          }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
        const list: EventCard[] = data?.events?.events ?? [];
        setEvents(list);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile]);

  useEffect(() => {
    if (events || error) return;
    const id = setInterval(() => {
      setStageIdx((i) => (i + 1) % STAGES.length);
    }, 1600);
    return () => clearInterval(id);
  }, [events, error]);

  useEffect(() => {
    if (events || error) return;
    const id = setInterval(() => setTick((t) => t + 1), 80);
    return () => clearInterval(id);
  }, [events, error]);

  const stage = STAGES[stageIdx];
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

  const isLoading = !events && !error;

  const mapPoints = useMemo(
    () =>
      (events ?? [])
        .filter(
          (e): e is EventCard & { lat: number; lng: number } =>
            typeof e.lat === "number" && typeof e.lng === "number"
        )
        .map((e) => ({
          title: e.title,
          venue: e.venue,
          neighborhood: e.neighborhood,
          url: e.url,
          datetime_iso: e.datetime_iso,
          price: e.price,
          lat: e.lat,
          lng: e.lng,
        })),
    [events]
  );

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
        {isLoading && (
          <div className="h-px w-full overflow-hidden bg-line">
            <div className="loader-bar h-px bg-black" />
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 py-10">
        {isLoading && (
          <>
            <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-muted">
              <span className="inline-block h-2 w-2 translate-y-[-1px] mr-2 animate-pulse rounded-full bg-black align-middle" />
              Searching the city · {String(stageIdx + 1).padStart(2, "0")} / {String(STAGES.length).padStart(2, "0")}
            </p>

            <h1 className="mt-4 text-7xl leading-[0.92] tracking-tight sm:text-8xl">
              Finding your <em className="font-normal">scene<span className="dots" /></em>
            </h1>

            <div key={stageIdx} className="step-enter mt-8 flex items-baseline gap-3">
              <span className="font-mono text-[12px] uppercase tracking-[0.22em] text-muted">
                Now
              </span>
              <span className="text-2xl italic">{stage}</span>
            </div>

            <div className="relative mt-10 aspect-[2/1] w-full overflow-hidden border border-line bg-white">
              <Radar tick={tick} />
            </div>

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
              We&rsquo;re reading the fog. This usually takes 30–90 seconds while
              we sweep event sources across the city.
            </p>
          </>
        )}

        {error && (
          <div className="step-enter">
            <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-muted">
              Something went sideways
            </p>
            <h1 className="mt-4 text-6xl leading-[0.95] tracking-tight">
              The fog won&rsquo;t lift.
            </h1>
            <p className="mt-6 max-w-xl text-xl text-muted">{error}</p>
            <Link
              href="/"
              className="mt-8 inline-flex items-center gap-2 border border-black bg-black px-6 py-4 font-mono text-[13px] uppercase tracking-[0.18em] text-white transition-colors hover:bg-white hover:text-black"
            >
              Try again →
            </Link>
          </div>
        )}

        {events && events.length === 0 && (
          <div className="step-enter">
            <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-muted">
              The city searched
            </p>
            <h1 className="mt-4 text-6xl leading-[0.95] tracking-tight">
              {emptyHeadline(profile)}
            </h1>
            <p className="mt-6 max-w-xl text-xl text-muted">
              We didn&rsquo;t find any events matching your selected interests
              {profile?.interests?.length
                ? ` (${profile.interests.join(", ")})`
                : ""}{" "}
              in this window. Try widening your interests or extending the date range.
            </p>
            <Link
              href="/"
              className="mt-8 inline-flex items-center gap-2 border border-black bg-black px-6 py-4 font-mono text-[13px] uppercase tracking-[0.18em] text-white transition-colors hover:bg-white hover:text-black"
            >
              Adjust preferences →
            </Link>
          </div>
        )}

        {events && events.length > 0 && (
          <div className="step-enter">
            <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-muted">
              {String(events.length).padStart(2, "0")} matches
            </p>
            <h1 className="mt-4 text-7xl leading-[0.92] tracking-tight sm:text-8xl">
              Your <em className="font-normal">scene</em>, surfaced.
            </h1>

            {tags.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-2">
                {tags.map((t, i) => (
                  <span
                    key={i}
                    className="border border-line px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            {mapPoints.length > 0 && (
              <div className="mt-10">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
                  {String(mapPoints.length).padStart(2, "0")} pins · across the city
                </p>
                <div className="mt-3">
                  <EventsMap points={mapPoints} />
                </div>
              </div>
            )}

            <ol className="mt-10 divide-y divide-line border-y border-line">
              {events.map((ev, i) => (
                <li key={i} className="py-8">
                  <div className="flex items-baseline gap-4">
                    <span className="font-mono text-[12px] uppercase tracking-[0.22em] text-muted">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="font-mono text-[12px] uppercase tracking-[0.18em] text-muted">
                      {formatDate(ev.datetime_iso)}
                    </span>
                  </div>
                  <h2 className="mt-2 text-3xl leading-tight tracking-tight sm:text-4xl">
                    <a
                      href={ev.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:italic"
                    >
                      {ev.title}
                    </a>
                  </h2>
                  <p className="mt-2 font-mono text-[12px] uppercase tracking-[0.18em] text-muted">
                    {ev.venue}
                    {ev.neighborhood ? ` · ${ev.neighborhood}` : ""}
                    {ev.price ? ` · ${ev.price}` : ""}
                  </p>
                  <p className="mt-4 max-w-2xl text-lg text-black/80">
                    {ev.description}
                  </p>
                  {ev.tags?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {ev.tags.map((t) => (
                        <span
                          key={t}
                          className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted"
                        >
                          #{t.replace(/\s+/g, "-")}
                        </span>
                      ))}
                    </div>
                  )}
                  {ev.why_it_matches && (
                    <p className="mt-4 max-w-2xl border-l border-black pl-4 text-base italic text-muted">
                      {ev.why_it_matches}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}
      </main>
    </div>
  );
}

function emptyHeadline(profile: Profile | null): string {
  const ints = profile?.interests ?? [];
  if (ints.length === 0) return "No events match right now.";
  if (ints.length === 1) return `No ${ints[0].toLowerCase()} events at this moment.`;
  if (ints.length === 2)
    return `No ${ints[0].toLowerCase()} or ${ints[1].toLowerCase()} events at this moment.`;
  const head = ints.slice(0, -1).map((s) => s.toLowerCase()).join(", ");
  const tail = ints[ints.length - 1].toLowerCase();
  return `No ${head}, or ${tail} events at this moment.`;
}

function formatDate(iso: string): string {
  try {
    const cleaned = iso.replace(/[\u2010-\u2015]/g, "-");
    const d = new Date(cleaned);
    if (isNaN(d.getTime())) return iso;
    return d
      .toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
      .toUpperCase();
  } catch {
    return iso;
  }
}

function Radar({ tick }: { tick: number }) {
  const W = 800;
  const H = 400;
  const cx = W / 2;
  const cy = H;
  const angle = (tick * 1.2) % 360;
  const radians = (angle * Math.PI) / 180 - Math.PI;
  const lineX = cx + Math.cos(radians) * H * 1.2;
  const lineY = cy + Math.sin(radians) * H * 1.2;

  const dots = [];
  for (let i = 0; i < 38; i++) {
    const a = ((i * 47) % 180) - 90;
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
      {[80, 160, 240, 320, 400].map((r) => (
        <path
          key={r}
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          stroke="#e5e5e5"
          strokeWidth="1"
          fill="none"
        />
      ))}
      <line x1={0} y1={cy} x2={W} y2={cy} stroke="#e5e5e5" />
      <line x1={cx} y1={0} x2={cx} y2={cy} stroke="#e5e5e5" />
      <line x1={cx} y1={cy} x2={lineX} y2={lineY} stroke="#000" strokeWidth="1.2" />
      {dots.map((d) => (
        <circle
          key={d.key}
          cx={d.x}
          cy={d.y}
          r={d.lit ? 4 : 2}
          fill={d.lit ? "#000" : "#bbb"}
        />
      ))}
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
