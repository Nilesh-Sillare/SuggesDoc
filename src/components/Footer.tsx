'use client'

import Image from 'next/image'
import Link from 'next/link'

const LINKS = [
  { href: '/home', label: 'Find a doctor' },
  { href: '/my-token', label: 'My token' },
  { href: '/?mode=signin', label: 'Sign in / Sign up' },
]

const BADGES = ['Verified doctors', 'Live token queue', 'Made for Maharashtra']

export default function Footer() {
  return (
    <footer className="relative mt-16 text-white">
      <style>{`
        @keyframes ft-ecg { 0% { stroke-dashoffset: 1000; } 60%,100% { stroke-dashoffset: 0; } }
        @keyframes ft-glow { 0%,100% { opacity: 0.3; transform: scale(1); } 50% { opacity: 0.55; transform: scale(1.12); } }
        .ft-ecg { stroke-dasharray: 1000; animation: ft-ecg 3.2s ease-in-out infinite; }
        .ft-glow { animation: ft-glow 5s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .ft-ecg, .ft-glow { animation: none !important; } }
      `}</style>

      {/* Wave edge */}
      <svg
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
        className="-mb-px block h-12 w-full text-[#0D3B3E] sm:h-16"
        fill="currentColor"
      >
        <path d="M0 40 C240 90 480 0 720 40 C960 80 1200 10 1440 40 L1440 80 L0 80 Z" />
      </svg>

      <div className="relative overflow-hidden bg-gradient-to-b from-[#0D3B3E] via-[#0A3036] to-[#06242A]">
        <div className="ft-glow pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#2E8B9E] blur-3xl" />
        <div
          className="ft-glow pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-[#4FBE8E] blur-3xl"
          style={{ animationDelay: '2s' }}
        />

        <div className="relative mx-auto max-w-6xl px-6 pb-8 pt-4">
          <div className="grid gap-10 md:grid-cols-[1.3fr_0.7fr_1.2fr]">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#2E8B9E] to-[#4FBE8E] shadow-[0_6px_20px_rgba(79,190,142,0.4)]">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M3 12h4l2 7 4-14 2 7h6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="font-serif text-2xl font-bold">SuggestDoc</span>
              </div>
              <p className="mt-3 max-w-sm text-sm text-[#A9C6C4]">
                Find the right doctor, without the guesswork. Pick a symptom, see who can help, and
                join the queue.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {BADGES.map((b) => (
                  <span
                    key={b}
                    className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-[#CDE9E6] backdrop-blur"
                  >
                    {b}
                  </span>
                ))}
              </div>
            </div>

            {/* Quick links */}
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#6FE3B2]">
                Quick links
              </h3>
              <ul className="flex flex-col gap-2">
                {LINKS.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="group inline-flex items-center gap-2 text-sm text-[#CDE9E6] transition hover:text-white"
                    >
                      <span className="transition-transform group-hover:translate-x-1">→</span>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Disclaimer */}
            <div className="rounded-2xl border border-[#FFB4A6]/25 bg-[#FF9C88]/10 p-4 backdrop-blur">
              <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-[#FFB4A6]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 11v5M12 8h.01" strokeLinecap="round" />
                </svg>
                Important Disclaimer
              </div>
              <p className="text-sm text-[#E8D5D0]">
                SuggestDoc is for guidance only, not medical advice. Please consult a licensed doctor
                for proper diagnosis and treatment.
              </p>
            </div>
          </div>

          {/* Heartbeat line */}
          <svg viewBox="0 0 1000 40" preserveAspectRatio="none" className="my-8 h-10 w-full text-[#4FBE8E]">
            <path
              className="ft-ecg"
              pathLength={1000}
              d="M0 20 H430 L450 20 L460 6 L475 34 L490 12 L500 20 H1000"
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.7"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {/* Creator (same layout, bigger) */}
          <div className="flex flex-col items-center text-center">
            <p className="mb-3 text-base text-[#A9C6C4]">Created by</p>
            <Image
              src="/pfp2.png"
              alt="Nilesh Sillare"
              width={160}
              height={160}
              className="h-32 w-32 rounded-full object-cover shadow-[0_0_40px_rgba(79,190,142,0.45)] ring-4 ring-white/10 sm:h-36 sm:w-36"
            />
            <p className="mt-3 text-2xl font-medium">Nilesh S. Sillare</p>
            <p className="text-base text-[#A9C6C4]">Creator &amp; Developer</p>
          </div>

          <div className="mt-8 border-t border-white/10 pt-5 text-center text-sm text-[#A9C6C4]">
            Made with <span className="text-[#E8734A]">&hearts;</span> for the people of Maharashtra
            {' · '}© {new Date().getFullYear()} SuggestDoc
          </div>
        </div>
      </div>
    </footer>
  )
}