'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import DistrictSelect from '@/components/DistrictSelect'
import Footer from '@/components/Footer'

type City = { id: string; Name: string }
type Specialty = { id: string; name: string }
type Symptom = { id: string; Name: string; specialties: Specialty[] }
type RawSymptom = {
  id: string
  Name: string
  SymptomSpecialty: { Speciality: Specialty | Specialty[] | null }[] | null
}

const POPULAR_NAMES = ['Fever', 'Headache', 'Cough', 'Back Pain', 'Stomach Pain']
const PLACEHOLDERS = ['stomachache', 'fever', 'toothache', 'back pain', 'skin rash']
const PLUSES = [
  { top: '10%', left: '6%', size: 20, delay: '0s' },
  { top: '24%', left: '92%', size: 16, delay: '1.2s' },
  { top: '58%', left: '3%', size: 24, delay: '0.6s' },
  { top: '78%', left: '90%', size: 14, delay: '2s' },
]

const card =
  'rounded-3xl border border-white/80 bg-white/80 shadow-[0_16px_50px_rgba(13,59,62,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-[#0C2226]/85 dark:shadow-[0_16px_50px_rgba(0,0,0,0.45)]'
const chip =
  'rounded-full bg-white/80 px-3.5 py-1.5 text-sm text-[#2E8B9E] shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md dark:bg-white/10 dark:text-[#8FD9C4] dark:hover:bg-white/20'

function Icon({ children, size = 18 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      {children}
    </svg>
  )
}

function HomeContent() {
  const router = useRouter()
  const params = useSearchParams()
  const glowRef = useRef<HTMLDivElement>(null)

  const [cities, setCities] = useState<City[]>([])
  const [symptoms, setSymptoms] = useState<Symptom[]>([])
  const [loaded, setLoaded] = useState(false)
  const [city, setCity] = useState('')
  const [query, setQuery] = useState(params.get('q') ?? '')
  const [notice, setNotice] = useState('')
  const [recent, setRecent] = useState<string[]>([])
  const [showAll, setShowAll] = useState(false)
  const [isGuest, setIsGuest] = useState<boolean | null>(null)
  const [active, setActive] = useState(-1)
  const [ph, setPh] = useState(0)

  // ---------- load data ----------
  useEffect(() => {
    supabase
      .from('City')
      .select('id, Name')
      .order('Name')
      .then(({ data, error }) => {
        if (error) {
          console.error('Error loading cities:', error)
          return
        }
        if (data) setCities(data as City[])
      })

    async function loadSymptoms() {
      const { data, error } = await supabase
        .from('Symptom')
        .select('id, Name, SymptomSpecialty(Speciality(id, name))')
        .order('Name')

      if (!error && data && data.length > 0) {
        const rows = data as unknown as RawSymptom[]
        setSymptoms(
          rows.map((s) => ({
            id: s.id,
            Name: s.Name,
            specialties: (s.SymptomSpecialty ?? []).flatMap((x) =>
              Array.isArray(x.Speciality) ? x.Speciality : x.Speciality ? [x.Speciality] : []
            ),
          }))
        )
        setLoaded(true)
        return
      }

      // Fallback: plain symptoms without specialties
      console.error('Symptoms with specialties failed or came back empty:', error)
      const { data: plain, error: plainError } = await supabase
        .from('Symptom')
        .select('id, Name')
        .order('Name')
      if (plainError) {
        console.error('Error loading symptoms:', plainError)
        setLoaded(true)
        return
      }
      setSymptoms(
        ((plain ?? []) as { id: string; Name: string }[]).map((s) => ({
          id: s.id,
          Name: s.Name,
          specialties: [],
        }))
      )
      setLoaded(true)
    }
    loadSymptoms()

    // Guest or logged in?
    supabase.auth.getSession().then(({ data }) => setIsGuest(!data.session))

    // Recent searches
    try {
      const stored = localStorage.getItem('recentSearches')
      if (stored) setRecent(JSON.parse(stored))
    } catch {
      localStorage.removeItem('recentSearches')
    }
  }, [])

  // Rotating example in the search bar
  useEffect(() => {
    const t = setInterval(() => setPh((i) => (i + 1) % PLACEHOLDERS.length), 2200)
    return () => clearInterval(t)
  }, [])

  // ---------- derived data ----------
  const popular = useMemo(() => {
    const byName = POPULAR_NAMES.map((n) => symptoms.find((s) => s.Name === n)).filter(
      (s): s is Symptom => Boolean(s)
    )
    return byName.length > 0 ? byName : symptoms.slice(0, 5)
  }, [symptoms])

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q || notice) return []
    return symptoms
      .filter((s) => s.Name.toLowerCase().includes(q))
      .sort((a, b) => {
        const aStart = a.Name.toLowerCase().startsWith(q) ? 0 : 1
        const bStart = b.Name.toLowerCase().startsWith(q) ? 0 : 1
        return aStart - bStart || a.Name.localeCompare(b.Name)
      })
  }, [query, symptoms, notice])

  const visible = suggestions.slice(0, 6)
  const showNoMatch =
    query.trim().length > 0 && symptoms.length > 0 && suggestions.length === 0 && !notice

  // ---------- helpers ----------
  function saveRecent(name: string) {
    const updated = [name, ...recent.filter((r) => r !== name)].slice(0, 5)
    setRecent(updated)
    localStorage.setItem('recentSearches', JSON.stringify(updated))
  }

  function clearRecent() {
    setRecent([])
    localStorage.removeItem('recentSearches')
  }

  // Sends ALL linked specialties to the doctors page (comma-separated ids)
    function goToDoctors(specialties: Specialty[], symptomName: string) {
    const p = new URLSearchParams({ specialty: specialties.map((s) => s.id).join(',') })
    if (city) p.set('city', city)
    p.set('symptom', symptomName)
    router.push(`/doctors?${p.toString()}`)
  }

  function selectSymptom(symptom: Symptom) {
    saveRecent(symptom.Name)
    if (symptom.specialties.length === 0) {
      setQuery(symptom.Name)
      setNotice(`No doctors are linked to “${symptom.Name}” yet.`)
      return
    }
     goToDoctors(symptom.specialties, symptom.Name)
  }

  function handleFindDoctors() {
    const q = query.trim().toLowerCase()
    if (!q) return
    const match = symptoms.find((s) => s.Name.toLowerCase() === q) ?? suggestions[0]
    if (match) selectSymptom(match)
  }

  function handleRecentClick(name: string) {
    const match = symptoms.find((s) => s.Name === name)
    if (match) selectSymptom(match)
    else setQuery(name)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' && visible.length) {
      e.preventDefault()
      setActive((a) => (a + 1) % visible.length)
    } else if (e.key === 'ArrowUp' && visible.length) {
      e.preventDefault()
      setActive((a) => (a <= 0 ? visible.length - 1 : a - 1))
    } else if (e.key === 'Escape') {
      setActive(-1)
    }
  }

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    if (glowRef.current) {
      glowRef.current.style.transform = `translate3d(${e.clientX - 260}px, ${e.clientY - 260}px, 0)`
    }
  }

  return (
    <div
      onMouseMove={onMove}
      className="relative min-h-screen overflow-hidden bg-[#E6F5F2] bg-cover bg-center bg-no-repeat dark:bg-[#071A1D]"
      style={{ backgroundImage: "url('/bg.png')" }}
    >
      <style>{`
        @keyframes hp-rise { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: none; } }
        @keyframes hp-swap { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @keyframes hp-pop { from { opacity: 0; transform: translateY(-8px) scale(0.98); } to { opacity: 1; transform: none; } }
        @keyframes hp-ping { 0% { transform: scale(1); opacity: 0.7; } 100% { transform: scale(2.6); opacity: 0; } }
        @keyframes hp-float { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-22px) rotate(25deg); } }
        @keyframes hp-grad { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
        @keyframes hp-shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
        .hp-rise { animation: hp-rise 0.65s cubic-bezier(0.2,0.8,0.2,1) backwards; }
        .hp-swap { animation: hp-swap 0.4s ease-out backwards; }
        .hp-pop { animation: hp-pop 0.2s ease-out; }
        .hp-ping { animation: hp-ping 1.8s cubic-bezier(0,0,0.2,1) infinite; }
        .hp-float { animation: hp-float 9s ease-in-out infinite; }
        .hp-gradtext { background-size: 200% auto; animation: hp-grad 6s linear infinite; }
        .hp-skel { background: linear-gradient(90deg,#dfeeee 25%,#f3fafa 50%,#dfeeee 75%); background-size: 800px 100%; animation: hp-shimmer 1.4s infinite linear; }
        .dark .hp-skel { background: linear-gradient(90deg,#12353a 25%,#1b4a50 50%,#12353a 75%); background-size: 800px 100%; }
        @media (prefers-reduced-motion: reduce) {
          .hp-rise, .hp-swap, .hp-pop, .hp-ping, .hp-float, .hp-gradtext, .hp-skel { animation: none !important; }
        }
      `}</style>

      {/* Dark mode overlay */}
      <div className="pointer-events-none absolute inset-0 hidden bg-gradient-to-br from-[#04151A]/95 via-[#07262B]/90 to-[#0A3338]/85 dark:block" />

      {/* Cursor glow */}
      <div
        ref={glowRef}
        className="pointer-events-none fixed left-0 top-0 z-0 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(79,190,142,0.2),transparent_65%)] transition-transform duration-300 ease-out"
      />

      {/* Floating plus signs */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        {PLUSES.map((p, i) => (
          <span
            key={i}
            className="hp-float absolute text-[#2E8B9E]/40 dark:text-[#4FBE8E]/35"
            style={{ top: p.top, left: p.left, animationDelay: p.delay }}
          >
            <svg width={p.size} height={p.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M12 4v16M4 12h16" strokeLinecap="round" />
            </svg>
          </span>
        ))}
      </div>

      <div className="relative z-10 mx-auto flex max-w-3xl flex-col gap-5 px-5 py-8">
        {/* Guest banner */}
        {isGuest && (
          <div className="hp-rise flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#2E8B9E]/20 bg-white/70 px-4 py-3 text-sm text-[#0D3B3E] backdrop-blur dark:border-white/10 dark:bg-white/10 dark:text-[#CDE9E6]">
            <span>You are browsing as a guest. You can view doctors, but you need an account to book a token.</span>
            <Link
              href="/?mode=signin"
              className="rounded-full bg-gradient-to-r from-[#2E8B9E] to-[#4FBE8E] px-4 py-1.5 text-xs font-medium text-white transition hover:brightness-105"
            >
              Sign in
            </Link>
          </div>
        )}

        {/* LOCATION CARD */}
        <div className={`${card} hp-rise relative z-30 p-5`} style={{ animationDelay: '0.05s' }}>
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2E8B9E] to-[#4FBE8E] text-white shadow-md">
              <Icon>
                <path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11z" />
                <circle cx="12" cy="10" r="2.5" />
              </Icon>
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#0D3B3E] dark:text-white">Select your location</h2>
              <p className="text-sm text-[#5C6B6F] dark:text-[#A9C6C4]">
                Choose your district to find nearby doctors
              </p>
            </div>
          </div>
          <DistrictSelect cities={cities} value={city} onChange={setCity} />
        </div>

        {/* HERO SEARCH CARD */}
        <div className={`${card} hp-rise relative z-20 p-6 text-center md:p-8`} style={{ animationDelay: '0.15s' }}>
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/75 px-4 py-1.5 text-xs font-medium text-[#0D3B3E] shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-[#CDE9E6]">
            <span className="relative flex h-2 w-2">
              <span className="hp-ping absolute inline-flex h-full w-full rounded-full bg-[#4FBE8E]" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#4FBE8E]" />
            </span>
            Doctors who can help
          </div>

          <h1 className="font-serif text-4xl font-bold leading-tight text-[#0D3B3E] md:text-5xl dark:text-white">
            What&apos;s{' '}
            <span className="hp-gradtext bg-gradient-to-r from-[#2E8B9E] via-[#4FBE8E] to-[#2E8B9E] bg-clip-text text-transparent dark:from-[#5FD0E6] dark:via-[#6FE3B2] dark:to-[#5FD0E6]">
              bothering you?
            </span>
          </h1>
          <p className="mx-auto mt-2 max-w-md text-base text-[#5C6B6F] dark:text-[#A9C6C4]">
            Find the right doctor{city ? ` in ${city}, Maharashtra` : ''} for your health concern
          </p>

          {/* Search bar */}
          <div className="relative mx-auto mt-6 max-w-xl">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (active >= 0 && visible[active]) selectSymptom(visible[active])
                else handleFindDoctors()
              }}
              className="flex items-center rounded-full bg-white p-1.5 pl-5 shadow-[0_8px_30px_rgba(13,59,62,0.12)] transition focus-within:shadow-[0_10px_40px_rgba(46,139,158,0.3)] dark:bg-[#0F2A2E] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
            >
              <span className="text-[#2E8B9E] dark:text-[#6FE3B2]">
                <Icon>
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
                </Icon>
              </span>
              <div className="relative flex-1">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setNotice('')
                    setActive(-1)
                  }}
                  onKeyDown={onKeyDown}
                  aria-label="Describe your health problem"
                  className="w-full bg-transparent px-3 py-3 text-left text-base text-[#2A2A28] outline-none dark:text-white"
                />
                {!query && (
                  <span className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 gap-1 text-base text-[#8FA3A3] dark:text-[#6F8F8F]">
                    Describe your problem, e.g.
                    <span key={ph} className="hp-swap font-medium text-[#2E8B9E] dark:text-[#6FE3B2]">
                      {PLACEHOLDERS[ph]}
                    </span>
                  </span>
                )}
              </div>
              <button
                type="submit"
                className="flex items-center gap-2 whitespace-nowrap rounded-full bg-gradient-to-r from-[#2E8B9E] to-[#4FBE8E] px-5 py-3 text-sm font-medium text-white transition hover:scale-[1.03] hover:brightness-105 active:scale-95"
              >
                Find Doctors
                <Icon size={16}>
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </Icon>
              </button>
            </form>

            {/* Suggestions */}
            {visible.length > 0 && (
              <div className="hp-pop absolute left-0 right-0 z-10 mt-2 overflow-hidden rounded-2xl border border-white/80 bg-white text-left shadow-[0_16px_40px_rgba(13,59,62,0.18)] dark:border-white/10 dark:bg-[#0C2226]">
                {visible.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => selectSymptom(s)}
                    onMouseEnter={() => setActive(i)}
                    className={`flex w-full items-center justify-between gap-3 px-5 py-3 text-left text-base text-[#2A2A28] transition dark:text-white ${
                      active === i ? 'bg-[#EAF6EE] dark:bg-white/10' : ''
                    }`}
                  >
                    {s.Name}
                    {s.specialties[0] && (
                      <span className="rounded-full bg-[#EAF6EE] px-2.5 py-0.5 text-xs text-[#2E8B9E] dark:bg-[#4FBE8E]/15 dark:text-[#6FE3B2]">
                        {s.specialties[0].name}
                        {s.specialties.length > 1 ? ` +${s.specialties.length - 1}` : ''}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {showNoMatch && (
              <div className="hp-pop absolute left-0 right-0 z-10 mt-2 rounded-2xl bg-white px-5 py-3 text-left text-sm text-[#5C6B6F] shadow-lg dark:bg-[#0C2226] dark:text-[#A9C6C4]">
                No matching symptom found. Try a different word.
              </div>
            )}
          </div>

          {notice && (
            <div className="hp-swap mx-auto mt-3 max-w-xl rounded-xl bg-[#FFF6DD] px-4 py-3 text-sm text-[#7A6A2E] dark:bg-[#3A3318] dark:text-[#E8D79A]">
              {notice}
            </div>
          )}

          {/* Popular symptoms */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            {!loaded &&
              [0, 1, 2, 3, 4].map((i) => <span key={i} className="hp-skel h-8 w-20 rounded-full" />)}
            {loaded && popular.length === 0 && (
              <span className="text-sm text-[#B3402A] dark:text-[#FFB4A6]">
                Could not load symptoms. Check your connection and refresh the page.
              </span>
            )}
            {popular.map((s, i) => (
              <button
                key={s.id}
                onClick={() => selectSymptom(s)}
                className={`${chip} hp-swap`}
                style={{ animationDelay: `${i * 70}ms` }}
              >
                {s.Name}
              </button>
            ))}
          </div>

          {/* Browse all */}
          {loaded && symptoms.length > 0 && (
            <div className="mt-5">
              <button
                onClick={() => setShowAll((v) => !v)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#2E8B9E] transition hover:text-[#0D3B3E] dark:text-[#6FE3B2] dark:hover:text-white"
              >
                {showAll ? 'Hide all symptoms' : `Browse all symptoms (${symptoms.length})`}
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className={`transition-transform ${showAll ? 'rotate-180' : ''}`}
                >
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {showAll && (
                <div className="mt-3 flex max-h-64 flex-wrap justify-center gap-2 overflow-y-auto rounded-2xl bg-white/50 p-3 dark:bg-white/5">
                  {symptoms.map((s, i) => (
                    <button
                      key={s.id}
                      onClick={() => selectSymptom(s)}
                      className={`${chip} hp-swap !px-3 !py-1 !text-xs`}
                      style={{ animationDelay: `${Math.min(i, 24) * 20}ms` }}
                    >
                      {s.Name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RECENT SEARCHES */}
        {recent.length > 0 && (
          <div className={`${card} hp-rise p-5`} style={{ animationDelay: '0.25s' }}>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#0D3B3E] dark:text-white">
                <span className="text-[#2E8B9E] dark:text-[#6FE3B2]">
                  <Icon size={16}>
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 3" strokeLinecap="round" />
                  </Icon>
                </span>
                <h3 className="text-base font-medium">Recent searches</h3>
              </div>
              <button
                onClick={clearRecent}
                className="text-xs text-[#7A8079] transition hover:text-[#B3402A] dark:text-[#A9C6C4] dark:hover:text-[#FFB4A6]"
              >
                Clear
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {recent.map((name) => (
                <button key={name} onClick={() => handleRecentClick(name)} className={chip}>
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// useSearchParams needs a Suspense boundary
export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  )
}