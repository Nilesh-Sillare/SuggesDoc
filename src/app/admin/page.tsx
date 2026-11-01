'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type Doc = {
  doctor_id: string
  user_id: string | null
  name: string | null
  email: string | null
  phone: string | null
  qualifications: string | null
  experience_years: number | null
  status: string
  token_enabled: boolean | null
  clinic_name: string | null
  clinic_city: string | null
}
type Tab = 'pending' | 'verified' | 'rejected' | 'all'
type Status = 'pending' | 'verified' | 'rejected'

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

// Anything that is not verified or rejected counts as pending
function norm(s: string): Status {
  return s === 'verified' || s === 'rejected' ? s : 'pending'
}

const STYLE: Record<Status, { strip: string; chip: string; label: string }> = {
  pending: {
    strip: 'bg-gradient-to-r from-[#F2C14E] to-[#E8734A]',
    chip: 'bg-[#F2C14E]/20 text-[#8A6A12] dark:text-[#F2D27A]',
    label: 'Pending',
  },
  verified: {
    strip: 'bg-gradient-to-r from-[#4FBE8E] to-[#2E8B9E]',
    chip: 'bg-[#4FBE8E]/15 text-[#1F7A55] dark:text-[#6FE3B2]',
    label: 'Verified',
  },
  rejected: {
    strip: 'bg-gradient-to-r from-[#E8734A] to-[#B3402A]',
    chip: 'bg-[#E8734A]/15 text-[#B3402A] dark:text-[#FF9C88]',
    label: 'Rejected',
  },
}

export default function AdminPage() {
  const router = useRouter()
  const glowRef = useRef<HTMLDivElement>(null)

  const [state, setState] = useState<'checking' | 'denied' | 'ready'>('checking')
  const [doctors, setDoctors] = useState<Doc[]>([])
  const [tab, setTab] = useState<Tab>('pending')
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState('')
  const [certBusy, setCertBusy] = useState('')
  const [confirmReject, setConfirmReject] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null)

  function flash(text: string, isError = false) {
    setNotice({ text, error: isError })
    setTimeout(() => setNotice(null), 3500)
  }

  const loadDoctors = useCallback(async () => {
    const { data, error: err } = await supabase.rpc('admin_list_doctors')
    if (err) {
      setError(err.message)
      return
    }
    setError('')
    setDoctors((data as Doc[]) ?? [])
  }, [])

  useEffect(() => {
    async function init() {
      const { data: sess } = await supabase.auth.getSession()
      if (!sess.session) {
        router.push('/?mode=signin')
        return
      }
      const { data: ok } = await supabase.rpc('is_admin')
      if (!ok) {
        setState('denied')
        return
      }
      setState('ready')
      await loadDoctors()
    }
    init()
  }, [router, loadDoctors])

  // Pick up new sign-ups without a manual refresh
  useEffect(() => {
    if (state !== 'ready') return
    const t = setInterval(loadDoctors, 30000)
    return () => clearInterval(t)
  }, [state, loadDoctors])

  async function refresh() {
    setRefreshing(true)
    await loadDoctors()
    setRefreshing(false)
  }

  async function setStatus(d: Doc, status: Status) {
    setBusyId(d.doctor_id)
    setConfirmReject('')
    const { error: err } = await supabase.rpc('admin_set_verification', {
      p_doctor_id: d.doctor_id,
      p_status: status,
    })
    setBusyId('')
    if (err) {
      flash(err.message, true)
      return
    }
    const who = d.name ?? 'Doctor'
    flash(
      status === 'verified'
        ? `${who} approved`
        : status === 'rejected'
        ? `${who} rejected`
        : `${who} moved back to pending`
    )
    await loadDoctors()
  }

  async function viewCertificate(d: Doc) {
    if (!d.user_id) {
      flash('This doctor has no certificate on file', true)
      return
    }
    setCertBusy(d.doctor_id)
    const { data, error: err } = await supabase.storage
      .from('doctor-certifications')
      .createSignedUrl(`${d.user_id}/certificate.pdf`, 300)
    setCertBusy('')
    if (err || !data) {
      flash('No certificate found for this doctor', true)
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    if (glowRef.current) {
      glowRef.current.style.transform = `translate3d(${e.clientX - 260}px, ${e.clientY - 260}px, 0)`
    }
  }

  // ---------- derived ----------
  const counts = {
    pending: doctors.filter((d) => norm(d.status) === 'pending').length,
    verified: doctors.filter((d) => norm(d.status) === 'verified').length,
    rejected: doctors.filter((d) => norm(d.status) === 'rejected').length,
    all: doctors.length,
  }
  const q = search.trim().toLowerCase()
  const list = doctors.filter((d) => {
    if (tab !== 'all' && norm(d.status) !== tab) return false
    if (!q) return true
    return [d.name, d.email, d.clinic_name, d.qualifications].some((v) => (v ?? '').toLowerCase().includes(q))
  })

  const tiles: { key: Tab; label: string; value: number; color: string }[] = [
    { key: 'pending', label: 'Pending', value: counts.pending, color: 'text-[#B88A12] dark:text-[#F2D27A]' },
    { key: 'verified', label: 'Verified', value: counts.verified, color: 'text-[#1F7A55] dark:text-[#6FE3B2]' },
    { key: 'rejected', label: 'Rejected', value: counts.rejected, color: 'text-[#B3402A] dark:text-[#FF9C88]' },
    { key: 'all', label: 'All doctors', value: counts.all, color: 'text-[#0D3B3E] dark:text-white' },
  ]

  const shell = (children: React.ReactNode) => (
    <div
      onMouseMove={onMove}
      className="relative min-h-screen overflow-hidden bg-[#E6F5F2] bg-cover bg-center bg-no-repeat dark:bg-[#071A1D]"
      style={{ backgroundImage: "url('/bg.png')" }}
    >
      <style>{`
        @keyframes ad-rise { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: none; } }
        @keyframes ad-toast { from { opacity: 0; transform: translate(-50%, 12px); } to { opacity: 1; transform: translate(-50%, 0); } }
        @keyframes ad-shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
        .ad-rise { animation: ad-rise 0.5s cubic-bezier(0.2,0.8,0.2,1) backwards; }
        .ad-toast { animation: ad-toast 0.3s ease-out; }
        .ad-skel { background: linear-gradient(90deg,#dfeeee 25%,#f3fafa 50%,#dfeeee 75%); background-size: 800px 100%; animation: ad-shimmer 1.4s infinite linear; }
        .dark .ad-skel { background: linear-gradient(90deg,#12353a 25%,#1b4a50 50%,#12353a 75%); background-size: 800px 100%; }
        @media (prefers-reduced-motion: reduce) { .ad-rise, .ad-toast, .ad-skel { animation: none !important; } }
      `}</style>
      <div className="pointer-events-none absolute inset-0 hidden bg-gradient-to-br from-[#04151A]/95 via-[#07262B]/90 to-[#0A3338]/85 dark:block" />
      <div
        ref={glowRef}
        className="pointer-events-none fixed left-0 top-0 z-0 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(79,190,142,0.2),transparent_65%)] transition-transform duration-300 ease-out"
      />
      {children}
    </div>
  )

  if (state === 'checking') {
    return shell(
      <div className="relative z-10 mx-auto flex max-w-5xl flex-col gap-5 px-6 py-8">
        <div className="ad-skel h-12 w-72 rounded-2xl" />
        <div className="ad-skel h-28 rounded-3xl" />
        <div className="ad-skel h-56 rounded-3xl" />
      </div>
    )
  }

  if (state === 'denied') {
    return shell(
      <div className="relative z-10 mx-auto max-w-md px-6 py-16">
        <div className={`${card} p-8 text-center`}>
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#E8734A] to-[#B3402A] text-white shadow-lg">
            <Icon size={24}>
              <rect x="5" y="11" width="14" height="9" rx="2.5" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round" />
            </Icon>
          </div>
          <p className="font-serif text-xl font-bold text-[#0D3B3E] dark:text-white">Admins only</p>
          <p className={`mt-1 text-sm ${muted}`}>This account does not have access to the admin panel.</p>
          <Link
            href="/home"
            className="mt-4 inline-block rounded-full bg-gradient-to-r from-[#2E8B9E] to-[#4FBE8E] px-6 py-2.5 text-sm font-medium text-white shadow-md transition hover:brightness-105 active:scale-95"
          >
            Go to home
          </Link>
        </div>
      </div>
    )
  }

  return shell(
    <>
      <div className="relative z-10 mx-auto flex max-w-5xl flex-col gap-5 px-6 py-8">
        {/* Title */}
        <div className="ad-rise flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#2E8B9E] dark:text-[#6FE3B2]">
              Admin panel
            </p>
            <h1 className="font-serif text-3xl font-bold text-[#0D3B3E] dark:text-white">Doctor approvals</h1>
          </div>
          <button
            onClick={refresh}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-4 py-2 text-sm font-medium text-[#0D3B3E] shadow-sm backdrop-blur transition hover:shadow-md active:scale-95 disabled:opacity-60 dark:border-white/10 dark:bg-white/10 dark:text-white"
          >
            <Icon size={14} className={refreshing ? 'animate-spin' : ''}>
              <path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5" strokeLinecap="round" strokeLinejoin="round" />
            </Icon>
            Refresh
          </button>
        </div>

        {/* Stat tiles (also the tabs) */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {tiles.map((t, i) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`ad-rise rounded-2xl border p-4 text-left backdrop-blur-xl transition hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] ${
                tab === t.key
                  ? 'border-[#4FBE8E] bg-white/95 shadow-md dark:bg-[#0C2226]'
                  : 'border-white/80 bg-white/70 dark:border-white/10 dark:bg-white/5'
              }`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <p className={`font-serif text-3xl font-bold ${t.color}`}>{t.value}</p>
              <p className={`text-xs ${muted}`}>{t.label}</p>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#2E8B9E] dark:text-[#6FE3B2]">
            <Icon>
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
            </Icon>
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, clinic or qualification"
            className="w-full rounded-full border border-[#D6E4E4] bg-white/90 py-3 pl-11 pr-4 text-sm text-[#2A2A28] outline-none transition placeholder:text-[#8FA3A3] focus:border-[#2E8B9E] focus:ring-4 focus:ring-[#2E8B9E]/15 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-[#6F8F8F]"
          />
        </div>

        {error && (
          <p className="rounded-2xl bg-[#FDEAE6] px-4 py-3 text-sm text-[#B3402A] dark:bg-[#3A1A16] dark:text-[#FFB4A6]">
            {error}
          </p>
        )}

        {!error && list.length === 0 && (
          <div className={`${card} ad-rise p-8 text-center`}>
            <p className="font-serif text-lg font-bold text-[#0D3B3E] dark:text-white">
              {tab === 'pending' && !q ? 'No doctors waiting for approval' : 'No doctors match'}
            </p>
            <p className={`mt-1 text-sm ${muted}`}>
              {tab === 'pending' && !q
                ? 'New doctor sign-ups will appear here automatically.'
                : 'Try another tab or search.'}
            </p>
          </div>
        )}

        {/* Doctor cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {list.map((d, i) => {
            const st = norm(d.status)
            const busy = busyId === d.doctor_id
            const initial = (d.name ?? '').replace(/^dr\.?\s*/i, '').trim().charAt(0).toUpperCase() || 'D'
            return (
              <div
                key={d.doctor_id}
                className="ad-rise relative flex flex-col gap-3 overflow-hidden rounded-3xl border border-white/80 bg-white/90 p-5 pt-6 shadow-[0_6px_20px_rgba(13,59,62,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-[#0C2226]/90"
                style={{ animationDelay: `${Math.min(i, 10) * 50}ms` }}
              >
                <span className={`absolute inset-x-0 top-0 h-1.5 ${STYLE[st].strip}`} />

                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2E8B9E] to-[#4FBE8E] font-serif text-lg font-bold text-white shadow-md">
                      {initial}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-lg font-bold text-[#0D3B3E] dark:text-white">
                        {d.name ?? 'Unnamed doctor'}
                      </p>
                      <p className={`truncate text-sm ${muted}`}>{d.email ?? 'No email'}</p>
                    </div>
                  </div>
                  <span className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${STYLE[st].chip}`}>
                    {STYLE[st].label}
                  </span>
                </div>

                <div className={`flex flex-col gap-1 text-sm ${muted}`}>
                  {(d.qualifications || d.experience_years != null) && (
                    <p>
                      {d.qualifications}
                      {d.experience_years != null ? ` · ${d.experience_years} yrs experience` : ''}
                    </p>
                  )}
                  {d.phone && <p>Phone: {d.phone}</p>}
                  {(d.clinic_name || d.clinic_city) && (
                    <p>
                      Clinic: {d.clinic_name ?? 'Not set'}
                      {d.clinic_city ? `, ${d.clinic_city}` : ''}
                    </p>
                  )}
                  <p className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${d.token_enabled ? 'bg-[#4FBE8E]' : 'bg-[#C9D3D3]'}`} />
                    {d.token_enabled ? 'Token booking on' : 'Token booking off'}
                  </p>
                </div>

                <button
                  onClick={() => viewCertificate(d)}
                  disabled={certBusy === d.doctor_id}
                  className="flex items-center justify-center gap-2 rounded-xl border border-[#3FA9D6]/40 py-2 text-sm font-medium text-[#2E7FA8] transition hover:bg-[#3FA9D6]/10 active:scale-[0.98] disabled:opacity-60 dark:text-[#7CC8EA]"
                >
                  <Icon size={15}>
                    <path d="M7 3h7l4 4v14H7z" strokeLinejoin="round" />
                    <path d="M14 3v4h4M9.5 13h5M9.5 17h5" strokeLinecap="round" />
                  </Icon>
                  {certBusy === d.doctor_id ? 'Opening...' : 'View certificate'}
                </button>

                {/* Actions */}
                <div className="mt-auto flex flex-col gap-2">
                  {confirmReject === d.doctor_id ? (
                    <div className="flex items-center gap-2 rounded-xl bg-[#FDEAE6] px-3 py-2 text-sm text-[#B3402A] dark:bg-[#3A1A16] dark:text-[#FFB4A6]">
                      <span className="flex-1">Reject this doctor?</span>
                      <button
                        onClick={() => setConfirmReject('')}
                        className="rounded-lg px-3 py-1 font-medium hover:bg-white/60 dark:hover:bg-white/10"
                      >
                        Keep
                      </button>
                      <button
                        onClick={() => setStatus(d, 'rejected')}
                        disabled={busy}
                        className="rounded-lg bg-[#B3402A] px-3 py-1 font-medium text-white transition hover:brightness-110 disabled:opacity-60"
                      >
                        {busy ? '...' : 'Yes, reject'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      {st !== 'verified' && (
                        <button
                          onClick={() => setStatus(d, 'verified')}
                          disabled={busy}
                          className="flex-1 rounded-xl bg-gradient-to-r from-[#4FBE8E] to-[#2E8B9E] py-2.5 text-sm font-medium text-white shadow-sm transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
                        >
                          {busy ? 'Saving...' : 'Approve'}
                        </button>
                      )}
                      {st === 'pending' && (
                        <button
                          onClick={() => setConfirmReject(d.doctor_id)}
                          disabled={busy}
                          className="flex-1 rounded-xl border border-[#E8734A]/50 py-2.5 text-sm font-medium text-[#B3402A] transition hover:bg-[#E8734A]/10 active:scale-[0.98] disabled:opacity-60 dark:text-[#FF9C88]"
                        >
                          Reject
                        </button>
                      )}
                      {st !== 'pending' && (
                        <button
                          onClick={() => setStatus(d, 'pending')}
                          disabled={busy}
                          className="flex-1 rounded-xl border border-[#D6E4E4] py-2.5 text-sm font-medium text-[#5C6B6F] transition hover:bg-white/70 active:scale-[0.98] disabled:opacity-60 dark:border-white/15 dark:text-[#A9C6C4] dark:hover:bg-white/5"
                        >
                          {st === 'verified' ? 'Revoke approval' : 'Back to pending'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {notice && (
        <div
          className={`ad-toast fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full px-5 py-2.5 text-sm font-medium shadow-xl ${
            notice.error ? 'bg-[#B3402A] text-white' : 'bg-[#0D3B3E] text-white'
          }`}
        >
          {notice.text}
        </div>
      )}
    </>
  )
}