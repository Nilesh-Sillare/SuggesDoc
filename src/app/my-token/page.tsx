'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

type Tok = {
  token_id: string
  token_number: number
  status: string
  booked_at: string
  doctor_id: string
  doctor_name: string | null
  doctor_phone: string | null
  clinic_name: string | null
  clinic_address: string | null
  clinic_city: string | null
  current_token_number: number | null
  people_ahead: number
}

const card =
  'rounded-3xl border border-white/80 bg-white/85 shadow-[0_16px_50px_rgba(13,59,62,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-[#0C2226]/85 dark:shadow-[0_16px_50px_rgba(0,0,0,0.45)]'
const muted = 'text-[#5C6B6F] dark:text-[#A9C6C4]'

function Icon({ children, size = 16, className }: { children: React.ReactNode; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      {children}
    </svg>
  )
}

function dateIST(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })
}
function timeIST(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })
}

export default function MyTokenPage() {
  const glowRef = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [tokens, setTokens] = useState<Tok[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isGuest, setIsGuest] = useState(false)
  const [live, setLive] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function load() {
    const { data: sess } = await supabase.auth.getSession()
    if (!sess.session) {
      setIsGuest(true)
      setLoading(false)
      return
    }
    setIsGuest(false)

    const { data, error: rpcErr } = await supabase.rpc('my_tokens')
    if (rpcErr) {
      setError(rpcErr.message)
      setLoading(false)
      return
    }
    setError('')
    setTokens((data as Tok[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()

    // Refresh quickly when anything changes, plus a slow fallback refresh
    function refresh() {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(load, 300)
    }
    const poll = setInterval(load, 15000)

    const channel = supabase
      .channel('my-token-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Doctors' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tokens' }, refresh)
      .subscribe((status) => setLive(status === 'SUBSCRIBED'))

    return () => {
      clearInterval(poll)
      if (timer.current) clearTimeout(timer.current)
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function cancelToken(id: string) {
    setBusyId(id)
    const { error: err } = await supabase.rpc('cancel_my_token', { p_token_id: id })
    setBusyId(null)
    setConfirmId(null)
    if (err) setError(err.message)
    else await load()
  }

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    if (glowRef.current) {
      glowRef.current.style.transform = `translate3d(${e.clientX - 260}px, ${e.clientY - 260}px, 0)`
    }
  }

  const active = tokens.filter((t) => t.status === 'Waiting' || t.status === 'Serving')
  const history = tokens.filter((t) => t.status !== 'Waiting' && t.status !== 'Serving').slice(0, 8)

  return (
    <div
      onMouseMove={onMove}
      className="relative min-h-screen overflow-hidden bg-[#E6F5F2] bg-cover bg-center bg-no-repeat dark:bg-[#071A1D]"
      style={{ backgroundImage: "url('/bg.png')" }}
    >
      <style>{`
        @keyframes tk-rise { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: none; } }
        @keyframes tk-ping { 0% { transform: scale(1); opacity: 0.7; } 100% { transform: scale(2.6); opacity: 0; } }
        @keyframes tk-glow { 0%,100% { box-shadow: 0 0 0 0 rgba(79,190,142,0.55); } 50% { box-shadow: 0 0 0 14px rgba(79,190,142,0); } }
        @keyframes tk-shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
        .tk-rise { animation: tk-rise 0.55s cubic-bezier(0.2,0.8,0.2,1) backwards; }
        .tk-ping { animation: tk-ping 1.8s cubic-bezier(0,0,0.2,1) infinite; }
        .tk-glow { animation: tk-glow 2s ease-in-out infinite; }
        .tk-skel { background: linear-gradient(90deg,#dfeeee 25%,#f3fafa 50%,#dfeeee 75%); background-size: 800px 100%; animation: tk-shimmer 1.4s infinite linear; }
        .dark .tk-skel { background: linear-gradient(90deg,#12353a 25%,#1b4a50 50%,#12353a 75%); background-size: 800px 100%; }
        @media (prefers-reduced-motion: reduce) { .tk-rise, .tk-ping, .tk-glow, .tk-skel { animation: none !important; } }
      `}</style>

      <div className="pointer-events-none absolute inset-0 hidden bg-gradient-to-br from-[#04151A]/95 via-[#07262B]/90 to-[#0A3338]/85 dark:block" />
      <div
        ref={glowRef}
        className="pointer-events-none fixed left-0 top-0 z-0 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(79,190,142,0.2),transparent_65%)] transition-transform duration-300 ease-out"
      />

      <div className="relative z-10 mx-auto flex max-w-2xl flex-col gap-5 px-5 py-8">
        {/* Back button */}
        <Link
          href="/home"
          className="group inline-flex w-fit items-center gap-2 rounded-full border border-white/80 bg-white/80 py-1.5 pl-1.5 pr-4 text-sm font-medium text-[#0D3B3E] shadow-sm backdrop-blur transition hover:-translate-x-0.5 hover:shadow-md active:scale-95 dark:border-white/10 dark:bg-white/10 dark:text-white"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#2E8B9E] to-[#4FBE8E] text-white shadow transition-transform duration-300 group-hover:-translate-x-1">
            <Icon size={14}>
              <path d="M19 12H5M11 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </Icon>
          </span>
          Back to home
        </Link>

        {/* Title */}
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-serif text-3xl font-bold text-[#0D3B3E] dark:text-white">My Tokens</h1>
          {!isGuest && (
            <span
              className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                live
                  ? 'bg-[#4FBE8E]/15 text-[#1F7A55] dark:text-[#6FE3B2]'
                  : 'bg-white/70 text-[#7A8B90] dark:bg-white/10 dark:text-[#A9C6C4]'
              }`}
            >
              <span className="relative flex h-2 w-2">
                {live && <span className="tk-ping absolute inline-flex h-full w-full rounded-full bg-[#4FBE8E]" />}
                <span className={`relative inline-flex h-2 w-2 rounded-full ${live ? 'bg-[#4FBE8E]' : 'bg-[#B8C4C4]'}`} />
              </span>
              {live ? 'Live' : 'Updating every 15s'}
            </span>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col gap-4">
            <div className="tk-skel h-64 rounded-3xl" />
            <div className="tk-skel h-40 rounded-3xl" />
          </div>
        )}

        {/* Guest */}
        {!loading && isGuest && (
          <div className={`${card} tk-rise p-8 text-center`}>
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#2E8B9E] to-[#4FBE8E] text-white shadow-lg">
              <Icon size={24}>
                <rect x="5" y="11" width="14" height="9" rx="2.5" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round" />
              </Icon>
            </div>
            <p className="font-serif text-xl font-bold text-[#0D3B3E] dark:text-white">Sign in to see your tokens</p>
            <p className={`mx-auto mt-1 max-w-xs text-sm ${muted}`}>
              Guests can browse doctors. Tokens are saved to your account.
            </p>
            <Link
              href="/?mode=signin"
              className="mt-4 inline-block rounded-full bg-gradient-to-r from-[#2E8B9E] to-[#4FBE8E] px-6 py-2.5 text-sm font-medium text-white shadow-md transition hover:brightness-105 active:scale-95"
            >
              Sign in
            </Link>
          </div>
        )}

        {/* Error */}
        {!loading && !isGuest && error && (
          <div className="rounded-2xl bg-[#FDEAE6] px-4 py-3 text-sm text-[#B3402A] dark:bg-[#3A1A16] dark:text-[#FFB4A6]">
            <p>{error}</p>
            {/function|my_tokens|schema cache/i.test(error) && (
              <p className="mt-1 text-xs opacity-80">
                The token functions are missing. Run the token SQL in Supabase first, then refresh.
              </p>
            )}
            <button onClick={load} className="mt-2 font-medium underline">
              Try again
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !isGuest && !error && active.length === 0 && (
          <div className={`${card} tk-rise p-8 text-center`}>
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#EAF6EE] text-[#2E8B9E] dark:bg-white/10 dark:text-[#6FE3B2]">
              <Icon size={26}>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 3" strokeLinecap="round" />
              </Icon>
            </div>
            <p className="font-serif text-xl font-bold text-[#0D3B3E] dark:text-white">No active tokens</p>
            <p className={`mt-1 text-sm ${muted}`}>Find a doctor and book a token to join the queue.</p>
            <Link
              href="/home"
              className="mt-4 inline-block rounded-full bg-gradient-to-r from-[#2E8B9E] to-[#4FBE8E] px-6 py-2.5 text-sm font-medium text-white shadow-md transition hover:brightness-105 active:scale-95"
            >
              Find a doctor
            </Link>
          </div>
        )}

        {/* Active tokens */}
        {!loading &&
          !isGuest &&
          active.map((t, i) => (
            <TokenCard
              key={t.token_id}
              t={t}
              index={i}
              confirming={confirmId === t.token_id}
              busy={busyId === t.token_id}
              onAsk={() => setConfirmId(t.token_id)}
              onKeep={() => setConfirmId(null)}
              onCancel={() => cancelToken(t.token_id)}
            />
          ))}

        {/* History */}
        {!loading && !isGuest && history.length > 0 && (
          <div className={`${card} tk-rise p-5`}>
            <h2 className="mb-3 font-serif text-lg font-bold text-[#0D3B3E] dark:text-white">Earlier tokens</h2>
            <div className="flex flex-col gap-2">
              {history.map((t) => (
                <div
                  key={t.token_id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-white/60 px-4 py-2.5 text-sm dark:bg-white/5"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[#0D3B3E] dark:text-white">
                      #{t.token_number} · {t.doctor_name ?? 'Doctor'}
                    </p>
                    <p className={`text-xs ${muted}`}>{dateIST(t.booked_at)}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      t.status === 'Done'
                        ? 'bg-[#4FBE8E]/15 text-[#1F7A55] dark:text-[#6FE3B2]'
                        : 'bg-[#B8C4C4]/25 text-[#5C6B6F] dark:text-[#A9C6C4]'
                    }`}
                  >
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function TokenCard({
  t,
  index,
  confirming,
  busy,
  onAsk,
  onKeep,
  onCancel,
}: {
  t: Tok
  index: number
  confirming: boolean
  busy: boolean
  onAsk: () => void
  onKeep: () => void
  onCancel: () => void
}) {
  const serving = t.status === 'Serving'
  const isNext = !serving && t.people_ahead === 0
  const dots = Math.min(t.people_ahead, 6)
  const extra = t.people_ahead - dots
  const current = Number(t.current_token_number) || 0
  const initial = (t.doctor_name ?? '').replace(/^dr\.?\s*/i, '').trim().charAt(0).toUpperCase() || 'D'
  const mapParts = [t.clinic_name, t.clinic_address, t.clinic_city].filter(Boolean)
  const mapUrl =
    'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(mapParts.join(', '))

  return (
    <div
      className={`tk-rise relative overflow-hidden rounded-3xl border bg-white/90 p-5 pt-6 shadow-[0_16px_50px_rgba(13,59,62,0.14)] backdrop-blur-xl dark:bg-[#0C2226]/90 ${
        serving ? 'tk-glow border-[#4FBE8E]' : 'border-white/80 dark:border-white/10'
      }`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <span
        className={`absolute inset-x-0 top-0 h-1.5 ${
          serving ? 'bg-gradient-to-r from-[#4FBE8E] to-[#2E8B9E]' : 'bg-gradient-to-r from-[#3FA9D6] to-[#4FBE8E]'
        }`}
      />

      {/* Doctor */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2E8B9E] to-[#4FBE8E] font-serif text-xl font-bold text-white shadow-md">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-[#0D3B3E] dark:text-white">{t.doctor_name ?? 'Doctor'}</p>
            {mapParts.length > 0 && (
              <p className={`flex items-start gap-1 text-sm leading-snug ${muted}`}>
                <Icon size={13} className="mt-0.5 flex-shrink-0 text-[#5FA89B]">
                  <path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11z" />
                  <circle cx="12" cy="10" r="2.5" />
                </Icon>
                <span>{mapParts.join(', ')}</span>
              </p>
            )}
          </div>
        </div>
        <span
          className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
            serving
              ? 'bg-[#4FBE8E] text-white'
              : 'bg-[#3FA9D6]/15 text-[#2E7FA8] dark:text-[#7CC8EA]'
          }`}
        >
          {serving ? 'Your turn' : 'Waiting'}
        </span>
      </div>

      {/* Numbers */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-gradient-to-br from-[#2E8B9E]/10 to-[#4FBE8E]/10 p-4 text-center">
          <p className="bg-gradient-to-r from-[#2E8B9E] to-[#4FBE8E] bg-clip-text font-serif text-5xl font-bold text-transparent">
            {t.token_number}
          </p>
          <p className={`mt-1 text-xs ${muted}`}>Your token</p>
        </div>
        <div className="rounded-2xl bg-white/70 p-4 text-center dark:bg-white/5">
          <p className="font-serif text-5xl font-bold text-[#0D3B3E] dark:text-white">{current > 0 ? current : '-'}</p>
          <p className={`mt-1 text-xs ${muted}`}>{current > 0 ? 'Now serving' : 'Not started yet'}</p>
        </div>
      </div>

      {/* Status */}
      {serving ? (
        <p className="mt-4 rounded-2xl bg-gradient-to-r from-[#4FBE8E] to-[#2E8B9E] px-4 py-3 text-center text-sm font-semibold text-white shadow-md">
          It&apos;s your turn. Please head in now.
        </p>
      ) : (
        <>
          <p
            className={`mt-4 rounded-2xl px-4 py-3 text-center text-sm font-medium ${
              isNext
                ? 'bg-[#4FBE8E]/15 text-[#1F7A55] dark:text-[#6FE3B2]'
                : 'bg-[#3FA9D6]/10 text-[#2E7FA8] dark:text-[#7CC8EA]'
            }`}
          >
            {isNext
              ? "You're next. Please be ready at the clinic."
              : `${t.people_ahead} ${t.people_ahead === 1 ? 'person' : 'people'} before you`}
          </p>

          {/* Queue lane */}
          <div className="mt-3 flex items-center justify-center gap-1.5">
            {Array.from({ length: dots }).map((_, i) => (
              <span key={i} className="h-2.5 w-2.5 rounded-full bg-[#B8C4C4] dark:bg-white/25" />
            ))}
            {extra > 0 && <span className={`text-xs ${muted}`}>+{extra}</span>}
            <span className="relative ml-1 flex h-4 w-4 items-center justify-center">
              <span className="tk-ping absolute inline-flex h-full w-full rounded-full bg-[#4FBE8E]" />
              <span className="relative h-4 w-4 rounded-full bg-gradient-to-br from-[#2E8B9E] to-[#4FBE8E]" />
            </span>
            <span className={`text-xs font-medium ${muted}`}>You</span>
          </div>
        </>
      )}

      {/* Actions */}
      <div className="mt-5 flex items-center gap-2">
        {mapParts.length > 0 && (
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#2E8B9E] to-[#4FBE8E] py-2.5 text-sm font-medium text-white shadow-sm transition hover:brightness-110 active:scale-[0.98]"
          >
            <Icon size={14}>
              <path d="M3 11l18-8-8 18-2-8-8-2z" strokeLinecap="round" strokeLinejoin="round" />
            </Icon>
            Directions
          </a>
        )}
        {t.doctor_phone && (
          <a
            href={'tel:' + t.doctor_phone}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#4FBE8E] py-2.5 text-sm font-medium text-[#2E8B9E] transition hover:bg-[#4FBE8E] hover:text-white active:scale-[0.98] dark:text-[#6FE3B2]"
          >
            <Icon size={14}>
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            </Icon>
            Call
          </a>
        )}
      </div>

      {/* Cancel (waiting tokens only) */}
      {t.status === 'Waiting' && (
        <div className="mt-3">
          {confirming ? (
            <div className="flex items-center gap-2 rounded-xl bg-[#FDEAE6] px-3 py-2 text-sm text-[#B3402A] dark:bg-[#3A1A16] dark:text-[#FFB4A6]">
              <span className="flex-1">Cancel this token?</span>
              <button onClick={onKeep} className="rounded-lg px-3 py-1 font-medium hover:bg-white/60 dark:hover:bg-white/10">
                Keep
              </button>
              <button
                onClick={onCancel}
                disabled={busy}
                className="rounded-lg bg-[#B3402A] px-3 py-1 font-medium text-white transition hover:brightness-110 disabled:opacity-60"
              >
                {busy ? 'Cancelling...' : 'Yes, cancel'}
              </button>
            </div>
          ) : (
            <button
              onClick={onAsk}
              className="w-full text-center text-sm text-[#7A8B90] transition hover:text-[#B3402A] dark:text-[#A9C6C4] dark:hover:text-[#FFB4A6]"
            >
              Cancel token
            </button>
          )}
        </div>
      )}

      <p className={`mt-3 text-center text-xs ${muted}`}>
        Booked {dateIST(t.booked_at)}, {timeIST(t.booked_at)}
      </p>
    </div>
  )
}