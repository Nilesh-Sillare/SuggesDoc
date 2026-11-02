'use client'

import { useEffect } from 'react'
import Link from 'next/link'

type Props = {
  open: boolean
  action: 'book' | 'rate'
  doctorName?: string
  onClose: () => void
}

const COPY = {
  book: {
    title: 'Sign in to book a token',
    text: (n?: string) =>
      `You are browsing as a guest. Sign in or create a free account to book a token${
        n ? ` with ${n}` : ''
      } and follow your place in the queue live.`,
    perks: ['Book a token in one tap', 'Watch your position update live', 'Cancel any time'],
  },
  rate: {
    title: 'Sign in to rate a doctor',
    text: (n?: string) =>
      `Only signed-in patients can rate${
        n ? ` ${n}` : ' a doctor'
      }. Sign in or create a free account to share your experience.`,
    perks: ['Rate doctors you have visited', 'Help other patients choose', 'Your rating stays on your account'],
  },
}

export default function SignInPrompt({ open, action, doctorName, onClose }: Props) {
  // Close with the Escape key
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const c = COPY[action]

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-5 backdrop-blur-[2px]"
      style={{ animation: 'sp-fade 0.2s ease-out' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={c.title}
    >
      <style>{`
        @keyframes sp-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes sp-pop { from { opacity: 0; transform: translateY(14px) scale(0.96); } to { opacity: 1; transform: none; } }
        @keyframes sp-ping { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(1.8); opacity: 0; } }
        .sp-pop { animation: sp-pop 0.28s cubic-bezier(0.2,0.8,0.2,1); }
        .sp-ping { animation: sp-ping 1.8s ease-out infinite; }
        @media (prefers-reduced-motion: reduce) { .sp-pop, .sp-ping { animation: none !important; } }
      `}</style>

      <div
        className="sp-pop relative w-full max-w-sm overflow-hidden rounded-3xl bg-white p-7 text-center shadow-[0_24px_70px_rgba(13,59,62,0.35)] dark:bg-[#0C2226]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#2E8B9E] via-[#4FBE8E] to-[#3FA9D6]" />

        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-[#7A8B90] transition hover:bg-[#EAF6EE] dark:text-[#A9C6C4] dark:hover:bg-white/10"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>

        <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center">
          <span className="sp-ping absolute inset-0 rounded-full bg-[#4FBE8E]/40" />
          <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#2E8B9E] to-[#4FBE8E] text-white shadow-lg">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="5" y="11" width="14" height="9" rx="2.5" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round" />
            </svg>
          </span>
        </div>

        <h2 className="font-serif text-2xl font-bold text-[#0D3B3E] dark:text-white">{c.title}</h2>
        <p className="mt-2 text-sm text-[#5C6B6F] dark:text-[#A9C6C4]">{c.text(doctorName)}</p>

        <ul className="mt-4 flex flex-col gap-1.5 text-left">
          {c.perks.map((p) => (
            <li key={p} className="flex items-center gap-2 text-sm text-[#2A2A28] dark:text-[#DCEEEC]">
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2E8B9E] to-[#4FBE8E] text-white">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M5 12l5 5 9-10" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              {p}
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-col gap-2">
          <Link
            href="/?mode=signin"
            className="rounded-2xl bg-gradient-to-r from-[#2E8B9E] to-[#4FBE8E] py-3 text-sm font-medium text-white shadow-[0_8px_22px_rgba(46,139,158,0.35)] transition hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.99]"
          >
            Sign in
          </Link>
          <Link
            href="/"
            className="rounded-2xl border-2 border-[#2E8B9E]/40 py-2.5 text-sm font-medium text-[#0D3B3E] transition hover:border-[#2E8B9E] hover:bg-[#EAF6EE] dark:border-[#4FBE8E]/40 dark:text-white dark:hover:bg-white/10"
          >
            Create a free account
          </Link>
          <button
            onClick={onClose}
            className="mt-1 text-sm text-[#7A8B90] transition hover:text-[#0D3B3E] dark:text-[#A9C6C4] dark:hover:text-white"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}