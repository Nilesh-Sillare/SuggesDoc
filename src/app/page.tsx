'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import ThemeToggle from '@/components/ThemeToggle'
import Footer from '@/components/Footer'

type Mode = 'signup' | 'signin'
type Role = 'patient' | 'doctor'

function homeFor(role: string | null | undefined) {
  return role === 'doctor' ? '/doctor/dashboard' : '/home'
}

const inputBase =
  'w-full rounded-2xl border border-[#D6E4E4] bg-white/90 py-3 pl-11 text-sm text-[#2A2A28] outline-none transition placeholder:text-[#8FA3A3] focus:border-[#2E8B9E] focus:ring-4 focus:ring-[#2E8B9E]/15 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-[#6F8F8F] dark:focus:border-[#4FBE8E] dark:focus:ring-[#4FBE8E]/20'
const inputClass = `${inputBase} pr-4`

const POPULAR = ['Fever', 'Headache', 'Cough', 'Back Pain']
const PLACEHOLDERS = ['Toothache', 'Fever', 'Back pain', 'Skin rash', 'Headache', 'Cough']
const STATS = [
  { n: 62, label: 'symptoms' },
  { n: 15, label: 'specialties' },
  { n: 36, label: 'districts' },
]
// Floating "+" signs in the background
const PLUSES = [
  { top: '12%', left: '46%', size: 22, delay: '0s' },
  { top: '30%', left: '4%', size: 16, delay: '1.2s' },
  { top: '62%', left: '52%', size: 26, delay: '0.6s' },
  { top: '82%', left: '28%', size: 14, delay: '2s' },
  { top: '18%', left: '90%', size: 18, delay: '1.6s' },
]

function Icon({ children, size = 18 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      {children}
    </svg>
  )
}

// Input with a leading icon
function Field({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#2E8B9E] dark:text-[#6FE3B2]">
        {icon}
      </span>
      {children}
    </div>
  )
}

// Number that counts up from 0 when the page loads
function CountUp({ to }: { to: number }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const dur = 1400
    function tick(now: number) {
      const p = Math.min((now - start) / dur, 1)
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to])
  return <>{n}</>
}

const STEPS = [
  {
    title: 'Pick a symptom',
    text: 'See which doctors can help',
    icon: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
      </>
    ),
  },
  {
    title: 'Choose your district',
    text: 'Call or get directions',
    icon: (
      <>
        <path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
  },
  {
    title: 'Join the queue',
    text: 'Digital tokens, live',
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" strokeLinecap="round" />
      </>
    ),
  },
]

// 3D tilt that follows the mouse (changes style directly, no re-render)
function tilt(e: React.MouseEvent<HTMLElement>) {
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  const x = (e.clientX - r.left) / r.width - 0.5
  const y = (e.clientY - r.top) / r.height - 0.5
  el.style.transform = `perspective(700px) rotateX(${-y * 9}deg) rotateY(${x * 9}deg) translateY(-6px)`
}
function untilt(e: React.MouseEvent<HTMLElement>) {
  e.currentTarget.style.transform = ''
}

function LandingPage() {
  const router = useRouter()
  const params = useSearchParams()
  const glowRef = useRef<HTMLDivElement>(null)

  const [mode, setMode] = useState<Mode>(params.get('mode') === 'signin' ? 'signin' : 'signup')
  const [role, setRole] = useState<Role>('patient')

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)

  const [qualifications, setQualifications] = useState('')
  const [certFile, setCertFile] = useState<File | null>(null)

  const [query, setQuery] = useState('')
  const [ph, setPh] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Rotating example in the search bar
  useEffect(() => {
    const t = setInterval(() => setPh((i) => (i + 1) % PLACEHOLDERS.length), 2200)
    return () => clearInterval(t)
  }, [])

  // Soft glow that follows the cursor
  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    if (glowRef.current) {
      glowRef.current.style.transform = `translate3d(${e.clientX - 260}px, ${e.clientY - 260}px, 0)`
    }
  }

  function goSearch(q: string) {
    const t = q.trim()
    router.push(t ? `/home?q=${encodeURIComponent(t)}` : '/home')
  }

  function switchMode(m: Mode) {
    setMode(m)
    setError('')
  }

  async function failSetup(message: string) {
    await supabase.auth.signOut()
    setError(
      'Your login was created but profile setup did not finish (' +
        message +
        '). Please try again with a different email.'
    )
  }

  // Sign Up / Sign In (logic unchanged)
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (mode === 'signup' && role === 'doctor') {
      if (!certFile) {
        setError('Please upload your certification/license document.')
        return
      }
      if (certFile.type !== 'application/pdf') {
        setError('The certification must be a PDF file.')
        return
      }
    }

    setLoading(true)

    try {
      const cleanEmail = email.trim()

      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
        })

        if (signUpError) {
          setError(signUpError.message)
          return
        }

        if (!data.user) {
          setError('Something went wrong creating your account.')
          return
        }

        if (!data.session) {
          setError(
            'Email confirmation is switched on, so your profile cannot be saved yet. Confirm your email or turn off "Confirm email" in Supabase Auth settings.'
          )
          return
        }

        const { error: profileError } = await supabase.from('users').insert({
          id: data.user.id,
          role,
          name: name.trim(),
          phone: phone.trim(),
          email: cleanEmail,
          status: 'active',
        })

        if (profileError) {
          await failSetup(profileError.message)
          return
        }

        if (role === 'patient') {
          const { error: patientError } = await supabase
            .from('Patient')
            .insert({ user_id: data.user.id })

          if (patientError) {
            await failSetup(patientError.message)
            return
          }
        }

        if (role === 'doctor' && certFile) {
          const filePath = `${data.user.id}/certificate.pdf`
          const { error: uploadError } = await supabase.storage
            .from('doctor-certifications')
            .upload(filePath, certFile, { contentType: 'application/pdf' })

          if (uploadError) {
            await failSetup(uploadError.message)
            return
          }

          const { error: doctorError } = await supabase.from('Doctors').insert({
            user_id: data.user.id,
            qualifications: qualifications.trim(),
            phone: phone.trim(),
            token_enabled: false,
          })

          if (doctorError) {
            await failSetup(doctorError.message)
            return
          }
        }

        router.push(homeFor(role))
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        })

        if (signInError) {
          setError(signInError.message)
          return
        }
        const { data: isAdmin } = await supabase.rpc('is_admin')
        if (isAdmin) {
          router.push('/admin')
          return
        }
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', data.user.id)
          .maybeSingle()

        router.push(homeFor(profile?.role))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      onMouseMove={onMove}
      className="relative flex min-h-screen flex-col overflow-hidden bg-[#E6F5F2] bg-cover bg-center bg-no-repeat dark:bg-[#071A1D]"
      style={{ backgroundImage: "url('/bg.png')" }}
    >
      <style>{`
        @keyframes lp-rise { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: none; } }
        @keyframes lp-swap { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @keyframes lp-ecg { 0% { stroke-dashoffset: 1000; } 60%,100% { stroke-dashoffset: 0; } }
        @keyframes lp-ping { 0% { transform: scale(1); opacity: 0.7; } 100% { transform: scale(2.6); opacity: 0; } }
        @keyframes lp-shake { 0%,100% { transform: translateX(0); } 20%,60% { transform: translateX(-6px); } 40%,80% { transform: translateX(6px); } }
        @keyframes lp-float { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-22px) rotate(25deg); } }
        @keyframes lp-grad { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
        @keyframes lp-sheen { to { transform: translateX(100%); } }
        .lp-rise { animation: lp-rise 0.7s cubic-bezier(0.2,0.8,0.2,1) backwards; }
        .lp-swap { animation: lp-swap 0.45s ease-out; }
        .lp-ecg { stroke-dasharray: 1000; animation: lp-ecg 3.2s ease-in-out infinite; }
        .lp-ping { animation: lp-ping 1.8s cubic-bezier(0,0,0.2,1) infinite; }
        .lp-shake { animation: lp-shake 0.4s; }
        .lp-float { animation: lp-float 9s ease-in-out infinite; }
        .lp-gradtext { background-size: 200% auto; animation: lp-grad 6s linear infinite; }
        .lp-sheen { position: relative; overflow: hidden; }
        .lp-sheen::after { content: ''; position: absolute; inset: 0; transform: translateX(-100%); background: linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.45) 50%, transparent 70%); }
        .lp-sheen:hover::after { animation: lp-sheen 0.9s ease; }
        @media (prefers-reduced-motion: reduce) {
          .lp-rise, .lp-swap, .lp-ecg, .lp-ping, .lp-shake, .lp-float, .lp-gradtext { animation: none !important; }
        }
      `}</style>

      {/* Dark mode: deep teal overlay over the background image */}
      <div className="pointer-events-none absolute inset-0 hidden bg-gradient-to-br from-[#04151A]/95 via-[#07262B]/90 to-[#0A3338]/85 dark:block" />

      {/* Cursor glow */}
      <div
        ref={glowRef}
        className="pointer-events-none fixed left-0 top-0 z-0 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(79,190,142,0.22),transparent_65%)] transition-transform duration-300 ease-out"
      />

      {/* Floating plus signs */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        {PLUSES.map((p, i) => (
          <span
            key={i}
            className="lp-float absolute text-[#2E8B9E]/40 dark:text-[#4FBE8E]/35"
            style={{ top: p.top, left: p.left, animationDelay: p.delay }}
          >
            <svg width={p.size} height={p.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M12 4v16M4 12h16" strokeLinecap="round" />
            </svg>
          </span>
        ))}
      </div>

      {/* ===== HEADER ===== */}
      <header className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-6 py-5">
        <div className="group flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#2E8B9E] to-[#4FBE8E] shadow-md transition-transform duration-300 group-hover:rotate-12">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M3 12h4l2 7 4-14 2 7h6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="font-serif text-2xl font-bold text-[#0D3B3E] dark:text-white">SuggestDoc</span>
        </div>

        <nav className="hidden items-center gap-2 md:flex">
          <span className="flex items-center gap-2 rounded-full bg-white/80 px-5 py-2 text-sm font-medium text-[#2E8B9E] shadow-sm dark:bg-white/10 dark:text-[#6FE3B2]">
            <Icon size={16}>
              <path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" strokeLinejoin="round" />
            </Icon>
            Home
          </span>
          <Link
            href="/home"
            className="rounded-full px-5 py-2 text-sm text-[#0D3B3E] transition hover:bg-white/60 dark:text-[#CDE9E6] dark:hover:bg-white/10"
          >
            Find Doctor
          </Link>
        </nav>

        <div className="flex justify-end">
          <ThemeToggle />
        </div>
      </header>

      {/* ===== MAIN ===== */}
      <main className="relative z-10 mx-auto grid w-full max-w-7xl flex-1 items-center gap-10 px-6 py-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
        {/* ---- LEFT: hero ---- */}
        <div className="lp-rise flex flex-col gap-6">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/80 bg-white/75 px-4 py-1.5 text-xs font-medium text-[#0D3B3E] shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10 dark:text-[#CDE9E6]">
            <span className="text-[#2E8B9E] dark:text-[#6FE3B2]">
              <Icon size={14}>
                <path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11z" />
                <circle cx="12" cy="10" r="2.5" />
              </Icon>
            </span>
            Made for the people of Maharashtra
            <span className="relative flex h-2 w-2">
              <span className="lp-ping absolute inline-flex h-full w-full rounded-full bg-[#4FBE8E]" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#4FBE8E]" />
            </span>
          </div>

          <div>
            <h1 className="font-serif text-5xl font-bold leading-[1.05] text-[#0D3B3E] sm:text-6xl lg:text-7xl dark:text-white">
              Find the right doctor,{' '}
              <span className="lp-gradtext bg-gradient-to-r from-[#2E8B9E] via-[#4FBE8E] to-[#2E8B9E] bg-clip-text text-transparent dark:from-[#5FD0E6] dark:via-[#6FE3B2] dark:to-[#5FD0E6]">
                without the guesswork.
              </span>
            </h1>
            <svg viewBox="0 0 300 14" className="mt-1 w-56 sm:w-72">
              <defs>
                <linearGradient id="lp-sw" x1="0" x2="1">
                  <stop offset="0%" stopColor="#2E8B9E" />
                  <stop offset="100%" stopColor="#4FBE8E" />
                </linearGradient>
              </defs>
              <path d="M2 9 Q150 -3 298 7" fill="none" stroke="url(#lp-sw)" strokeWidth="3.5" strokeLinecap="round" />
            </svg>
          </div>

          <p className="max-w-md text-base text-[#3E5558] dark:text-[#A9C6C4]">
            Search, book and consult with verified doctors near you — quickly and easily.
          </p>

          {/* Search bar with rotating example */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              goSearch(query)
            }}
            className="flex max-w-xl items-center rounded-full bg-white p-1.5 pl-5 shadow-[0_8px_30px_rgba(13,59,62,0.12)] transition focus-within:shadow-[0_10px_40px_rgba(46,139,158,0.3)] dark:bg-[#0F2A2E] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
          >
            <span className="text-[#2E8B9E] dark:text-[#6FE3B2]">
              <Icon>
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
              </Icon>
            </span>
            <div className="relative flex-1">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search symptoms"
                className="w-full bg-transparent px-3 py-2.5 text-sm text-[#2A2A28] outline-none dark:text-white"
              />
              {!query && (
                <span className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 gap-1 text-sm text-[#8FA3A3] dark:text-[#6F8F8F]">
                  Search symptoms, e.g.
                  <span key={ph} className="lp-swap font-medium text-[#2E8B9E] dark:text-[#6FE3B2]">
                    {PLACEHOLDERS[ph]}
                  </span>
                </span>
              )}
            </div>
            <button
              type="submit"
              aria-label="Search"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#2E8B9E] to-[#4FBE8E] text-white transition hover:scale-110 hover:brightness-105 active:scale-95"
            >
              <Icon>
                <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </Icon>
            </button>
          </form>

          {/* Popular searches */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-[#0D3B3E] dark:text-[#CDE9E6]">Popular Searches:</span>
            {POPULAR.map((p) => (
              <button
                key={p}
                onClick={() => goSearch(p)}
                className="rounded-full bg-white/80 px-3.5 py-1 text-xs text-[#0D3B3E] shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md dark:bg-white/10 dark:text-[#CDE9E6] dark:hover:bg-white/20"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Count-up stats */}
          <div className="flex items-center gap-6">
            {STATS.map((s, i) => (
              <div key={s.label} className="flex items-center gap-6">
                <div>
                  <p className="font-serif text-3xl font-bold text-[#0D3B3E] dark:text-white">
                    <CountUp to={s.n} />
                  </p>
                  <p className="text-xs text-[#5C6B6F] dark:text-[#A9C6C4]">{s.label}</p>
                </div>
                {i < STATS.length - 1 && <span className="h-9 w-px bg-[#2E8B9E]/25 dark:bg-white/15" />}
              </div>
            ))}
          </div>

          {/* 3 feature cards with 3D tilt */}
          <div className="grid gap-3 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <Link
                key={s.title}
                href="/home"
                onMouseMove={tilt}
                onMouseLeave={untilt}
                className="lp-rise group flex flex-col rounded-2xl border border-white/80 bg-white/70 p-4 shadow-[0_6px_20px_rgba(13,59,62,0.07)] backdrop-blur-md transition-transform duration-200 ease-out hover:bg-white/90 hover:shadow-[0_14px_32px_rgba(13,59,62,0.14)] dark:border-white/10 dark:bg-white/[0.06] dark:hover:bg-white/10"
                style={{ animationDelay: `${0.3 + i * 0.15}s` }}
              >
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#BFEBDD] to-[#8FD9C4] text-[#0D6B66] transition-transform duration-300 group-hover:scale-110 dark:from-[#1B5E5E] dark:to-[#2E8B9E] dark:text-[#BFF3E3]">
                  <Icon size={20}>{s.icon}</Icon>
                </div>
                <p className="font-serif text-base font-bold text-[#0D3B3E] dark:text-white">{s.title}</p>
                <div className="mt-1 flex items-end justify-between gap-2">
                  <p className="text-xs text-[#5C6B6F] dark:text-[#A9C6C4]">{s.text}</p>
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2E8B9E] to-[#4FBE8E] text-white transition-transform group-hover:translate-x-1">
                    <Icon size={14}>
                      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                    </Icon>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ---- RIGHT: form card ---- */}
        <div className="lp-rise mx-auto w-full max-w-md lg:mx-0 lg:justify-self-end">
          <div className="rounded-3xl border border-white/80 bg-white/85 p-6 shadow-[0_20px_60px_rgba(13,59,62,0.16)] backdrop-blur-xl dark:border-white/10 dark:bg-[#0C2226]/85 dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
            {/* Patient / Doctor tabs (sign-up only) */}
            {mode === 'signup' && (
              <div className="relative mb-5 flex rounded-full bg-[#EAF0EF] p-1 dark:bg-white/10">
                <div
                  className={`absolute bottom-1 top-1 w-[calc(50%-4px)] rounded-full bg-gradient-to-r from-[#2E8B9E] to-[#4FBE8E] shadow-sm transition-transform duration-300 ease-out ${
                    role === 'patient' ? 'translate-x-0' : 'translate-x-[calc(100%+8px)]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setRole('patient')}
                  className={`relative z-10 flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-sm font-medium transition-colors ${
                    role === 'patient' ? 'text-white' : 'text-[#2E8B9E] dark:text-[#8FD9C4]'
                  }`}
                >
                  <Icon size={16}>
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round" />
                  </Icon>
                  Patient
                </button>
                <button
                  type="button"
                  onClick={() => setRole('doctor')}
                  className={`relative z-10 flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-sm font-medium transition-colors ${
                    role === 'doctor' ? 'text-white' : 'text-[#2E8B9E] dark:text-[#8FD9C4]'
                  }`}
                >
                  <Icon size={16}>
                    <rect x="3" y="5" width="18" height="15" rx="3" />
                    <path d="M12 9v7M8.5 12.5h7" strokeLinecap="round" />
                  </Icon>
                  Doctor
                </button>
              </div>
            )}

            <div key={mode} className="lp-swap mb-4">
              <h2 className="font-serif text-3xl font-bold text-[#0D3B3E] dark:text-white">
                {mode === 'signup' ? 'Create your account' : 'Welcome back'}
              </h2>
              <p className="mt-0.5 text-sm text-[#5C6B6F] dark:text-[#A9C6C4]">
                {mode === 'signup' ? 'It only takes a minute.' : 'Sign in to continue.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {mode === 'signup' && (
                <>
                  <Field
                    icon={
                      <Icon>
                        <circle cx="12" cy="8" r="4" />
                        <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round" />
                      </Icon>
                    }
                  >
                    <input
                      type="text"
                      placeholder="Full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className={inputClass}
                    />
                  </Field>
                  <Field
                    icon={
                      <Icon>
                        <path
                          d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"
                          strokeLinejoin="round"
                        />
                      </Icon>
                    }
                  >
                    <input
                      type="tel"
                      placeholder="Phone number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      className={inputClass}
                    />
                  </Field>

                  {role === 'doctor' && (
                    <div className="lp-swap flex flex-col gap-3">
                      <Field
                        icon={
                          <Icon>
                            <rect x="3" y="5" width="18" height="15" rx="3" />
                            <path d="M12 9v7M8.5 12.5h7" strokeLinecap="round" />
                          </Icon>
                        }
                      >
                        <input
                          type="text"
                          placeholder="Qualifications (e.g. MBBS, MD)"
                          value={qualifications}
                          onChange={(e) => setQualifications(e.target.value)}
                          required
                          className={inputClass}
                        />
                      </Field>
                      <label className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-2xl border-2 border-dashed border-[#2E8B9E]/40 bg-[#2E8B9E]/5 px-4 py-3 text-sm text-[#2A2A28] transition hover:border-[#2E8B9E] hover:bg-[#2E8B9E]/10 dark:border-[#4FBE8E]/40 dark:text-[#DCEEEC] dark:hover:border-[#4FBE8E]">
                        <span className="truncate">
                          {certFile ? certFile.name : 'Upload certification / license (PDF)'}
                        </span>
                        <span className="flex-shrink-0 text-[#2E8B9E] dark:text-[#6FE3B2]">
                          <Icon>
                            <path d="M12 16V4M7 9l5-5 5 5M4 20h16" strokeLinecap="round" strokeLinejoin="round" />
                          </Icon>
                        </span>
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={(e) => setCertFile(e.target.files ? e.target.files[0] : null)}
                          className="hidden"
                        />
                      </label>
                      <p className="rounded-xl bg-[#FFF6DD] px-3 py-2 text-xs text-[#7A8079] dark:bg-[#3A3318] dark:text-[#E8D79A]">
                        Your account will be reviewed and verified by an admin before it becomes active.
                      </p>
                    </div>
                  )}
                </>
              )}

              <Field
                icon={
                  <Icon>
                    <rect x="3" y="5" width="18" height="14" rx="3" />
                    <path d="M3 8l9 6 9-6" strokeLinecap="round" strokeLinejoin="round" />
                  </Icon>
                }
              >
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={inputClass}
                />
              </Field>

              <Field
                icon={
                  <Icon>
                    <rect x="5" y="11" width="14" height="9" rx="2.5" />
                    <path d="M8 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round" />
                  </Icon>
                }
              >
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className={`${inputBase} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5C6B6F] transition hover:text-[#2E8B9E] dark:text-[#A9C6C4] dark:hover:text-[#6FE3B2]"
                >
                  <Icon>
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" strokeLinejoin="round" />
                    <circle cx="12" cy="12" r="3" />
                    {!showPw && <path d="M4 4l16 16" strokeLinecap="round" />}
                  </Icon>
                </button>
              </Field>
                            {mode === 'signin' && (
                <div className="-mt-1 text-right">
                  <Link
                    href="/forgot-password"
                    className="text-xs font-medium text-[#2E8B9E] hover:underline dark:text-[#6FE3B2]"
                  >
                    Forgot password?
                  </Link>
                </div>
              )}

              {error && (
                <p
                  key={error}
                  className="lp-shake rounded-xl bg-[#FDEAE6] px-3 py-2 text-sm text-[#B3402A] dark:bg-[#3A1A16] dark:text-[#FFB4A6]"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="lp-sheen mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#2E8B9E] to-[#4FBE8E] py-3.5 text-sm font-medium text-white shadow-[0_8px_22px_rgba(46,139,158,0.35)] transition hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.99] disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <circle cx="12" cy="12" r="9" strokeOpacity="0.3" />
                      <path d="M21 12a9 9 0 0 0-9-9" strokeLinecap="round" />
                    </svg>
                    Please wait...
                  </>
                ) : (
                  <>
                    {mode === 'signup' ? 'Create account' : 'Sign in'}
                    <Icon size={16}>
                      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                    </Icon>
                  </>
                )}
              </button>
            </form>

            {/* Guest option: only on PATIENT sign-up */}
            {mode === 'signup' && role === 'patient' && (
              <div className="lp-swap">
                <div className="my-4 flex items-center gap-3 text-xs text-[#8FA3A3] dark:text-[#6F8F8F]">
                  <span className="h-px flex-1 bg-[#D6E4E4] dark:bg-white/10" />
                  or
                  <span className="h-px flex-1 bg-[#D6E4E4] dark:bg-white/10" />
                </div>
                <button
                  type="button"
                  onClick={() => router.push('/home')}
                  className="group flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#2E8B9E]/40 bg-white/60 py-3 text-sm font-medium text-[#0D3B3E] transition hover:border-[#2E8B9E] hover:bg-white dark:border-[#4FBE8E]/40 dark:bg-white/5 dark:text-white dark:hover:border-[#4FBE8E] dark:hover:bg-white/10"
                >
                  Continue as guest
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </button>
                <p className="mt-2 text-center text-xs text-[#5C6B6F] dark:text-[#A9C6C4]">
                  Browse doctors freely. You need an account to book a token.
                </p>
              </div>
            )}

            {/* Switch between sign up and sign in */}
            <p className="mt-4 text-center text-sm text-[#5C6B6F] dark:text-[#A9C6C4]">
              {mode === 'signup' ? 'Already have an account? ' : 'New to SuggestDoc? '}
              <button
                type="button"
                onClick={() => switchMode(mode === 'signup' ? 'signin' : 'signup')}
                className="font-medium text-[#2E8B9E] underline-offset-2 hover:underline dark:text-[#6FE3B2]"
              >
                {mode === 'signup' ? 'Sign in' : 'Create an account'}
              </button>
            </p>
          </div>
        </div>
      </main>

      {/* ===== BOTTOM BAR ===== */}
           <footer className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-5 pt-4">
        <div className="flex flex-col items-stretch gap-3 lg:flex-row lg:items-center lg:gap-6">
          <div className="flex items-center gap-3">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <path d="M12 2l8 3v6c0 5-3.4 9-8 11-4.6-2-8-6-8-11V5z" fill="#2E8B9E" />
              <path d="M8.5 12l2.5 2.5 4.5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-[#0D3B3E] dark:text-white">Trusted Healthcare</p>
              <p className="text-xs text-[#5C6B6F] dark:text-[#A9C6C4]">Reliable. Secure. Always.</p>
            </div>
          </div>

          <svg
            viewBox="0 0 1000 40"
            preserveAspectRatio="none"
            className="hidden h-10 flex-1 text-[#2E8B9E] lg:block dark:text-[#4FBE8E]"
          >
            <path
              className="lp-ecg"
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
        </div>
      </footer>
    </div>
  )
}

// useSearchParams needs a Suspense boundary
export default function Page() {
  return (
    <Suspense fallback={null}>
      <LandingPage />
    </Suspense>
  )
}