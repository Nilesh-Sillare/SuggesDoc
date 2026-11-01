'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import ReviewsPanel from '@/components/ReviewsPanel'

type Doctor = {
  id: string
  name: string | null
  specialty_id: string
  specialty_name: string
  qualifications: string | null
  experience_years: number | null
  phone: string | null
  consultation_hours: string | null
  token_enabled: boolean | null
  last_issued_token_number: number | null
  current_token_number: number | null
  rating: number | string | null
  rating_count: number | string | null
  comments_enabled: boolean | null
  clinic_name: string | null
  clinic_address: string | null
  city: string | null
  clinic_phone: string | null
}
type Specialty = { id: string; name: string }
type Sort = 'name' | 'rating'

const GP = 'General Physician'
const EMERGENCY = ['chest pain', 'shortness of breath', 'palpitations']
const card =
  'rounded-3xl border border-white/80 bg-white/80 shadow-[0_16px_50px_rgba(13,59,62,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-[#0C2226]/85 dark:shadow-[0_16px_50px_rgba(0,0,0,0.45)]'
const muted = 'text-[#5C6B6F] dark:text-[#A9C6C4]'
const soft = 'text-[#7A8B90] dark:text-[#8FA8A6]'
// General Physician = green, every specialist = blue
const gpGrad = 'bg-gradient-to-r from-[#4FBE8E] to-[#2E8B9E]'
const spGrad = 'bg-gradient-to-r from-[#3FA9D6] to-[#3B6FD6]'
const grad = (name: string) => (name === GP ? gpGrad : spGrad)

function pill(on: boolean) {
  return `rounded-full px-3.5 py-1.5 text-sm font-medium transition active:scale-95 ${
    on
      ? 'bg-gradient-to-r from-[#2E8B9E] to-[#4FBE8E] text-white shadow-md'
      : 'bg-white/80 text-[#2E8B9E] hover:bg-white dark:bg-white/10 dark:text-[#8FD9C4] dark:hover:bg-white/20'
  }`
}

function Icon({
  children,
  size = 14,
  className,
}: {
  children: React.ReactNode
  size?: number
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
    >
      {children}
    </svg>
  )
}

const STAR = 'M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-4-6.3 4 1.7-7-5.4-4.7 7.1-.6z'

function joinNames(names: string[]) {
  if (names.length <= 1) return names.join('')
  return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1]
}

function directionsUrl(d: Doctor) {
  const parts = [d.clinic_name, d.clinic_address, d.city].filter(Boolean)
  return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(parts.join(', '))
}

function compareSpecialtyNames(a: string, b: string) {
  if (a === GP && b !== GP) return -1
  if (b === GP && a !== GP) return 1
  return a.localeCompare(b)
}

function PickDoctorContent() {
  const params = useSearchParams()
  const specialtyParam = params.get('specialty') ?? ''
  const city = params.get('city') ?? ''
  const emergency = EMERGENCY.includes((params.get('symptom') ?? '').trim().toLowerCase())
  const glowRef = useRef<HTMLDivElement>(null)

  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isGuest, setIsGuest] = useState<boolean | null>(null)

  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<Sort>('name')
  const [tokenOnly, setTokenOnly] = useState(false)

  const [reviewTarget, setReviewTarget] = useState<Doctor | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const silentRef = useRef(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setIsGuest(!data.session))
  }, [])

  useEffect(() => {
    const ids = specialtyParam.split(',').filter(Boolean)
    if (ids.length === 0) {
      setLoading(false)
      return
    }

    async function load() {
      const silent = silentRef.current
      silentRef.current = false
      if (!silent) setLoading(true)
      setError('')

      const { data: sp, error: spError } = await supabase
        .from('Speciality')
        .select('id, name')
        .in('id', ids)
      if (spError) console.error('Error loading specialties:', spError)
      setSpecialties(sp ?? [])

      let query = supabase.from('doctor_public').select('*').in('specialty_id', ids)
      if (city) query = query.eq('city', city)
      const { data, error: docError } = await query.order('name')

      if (docError) {
        console.error('Error loading doctors:', docError)
        setError('Could not load doctors. Please try again.')
        setDoctors([])
      } else {
        setDoctors((data as Doctor[]) ?? [])
      }
      setLoading(false)
    }
    load()
  }, [specialtyParam, city, reloadKey])

  function refreshRatings() {
    silentRef.current = true
    setReloadKey((k) => k + 1)
  }

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    if (glowRef.current) {
      glowRef.current.style.transform = `translate3d(${e.clientX - 260}px, ${e.clientY - 260}px, 0)`
    }
  }

  const orderedSpecialties = [...specialties].sort((a, b) => compareSpecialtyNames(a.name, b.name))

  // All specialty names per doctor (from the full list, so badges stay complete)
  const namesById = new Map<string, string[]>()
  doctors.forEach((d) => {
    const list = namesById.get(d.id) ?? []
    if (!list.includes(d.specialty_name)) list.push(d.specialty_name)
    namesById.set(d.id, list)
  })

  const q = search.trim().toLowerCase()
  const visibleDoctors = doctors.filter((d) => {
    if (tokenOnly && !d.token_enabled) return false
    if (!q) return true
    return [d.name, d.clinic_name, d.clinic_address].some((v) => (v ?? '').toLowerCase().includes(q))
  })

  const placed = new Set<string>()
  const groups = orderedSpecialties
    .map((s) => {
      const groupDoctors = visibleDoctors
        .filter((d) => d.specialty_id === s.id && !placed.has(d.id))
        .sort((a, b) => {
          if (sort === 'rating') {
            const diff = (Number(b.rating) || 0) - (Number(a.rating) || 0)
            if (diff !== 0) return diff
          }
          return (a.name ?? '').localeCompare(b.name ?? '')
        })
      groupDoctors.forEach((d) => placed.add(d.id))
      return { specialty: s, doctors: groupDoctors }
    })
    .filter((g) => g.doctors.length > 0)

  const specialtyText = joinNames(specialties.map((s) => s.name))
  const allCount = new Set(doctors.map((d) => d.id)).size
  const totalCount = new Set(visibleDoctors.map((d) => d.id)).size

  // Header stats
  const unique = Array.from(new Map(doctors.map((d) => [d.id, d])).values())
  const tokenCount = unique.filter((d) => d.token_enabled).length
  const ratings = unique.map((d) => Number(d.rating)).filter((n) => !Number.isNaN(n) && n > 0)
  const avg = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : ''
  const stats = [
    `${allCount} ${allCount === 1 ? 'doctor' : 'doctors'}`,
    `${tokenCount} with live tokens`,
    avg ? `★ ${avg} average rating` : '',
  ].filter(Boolean)

  return (
    <div
      onMouseMove={onMove}
      className="relative min-h-screen overflow-hidden bg-[#E6F5F2] bg-cover bg-center bg-no-repeat dark:bg-[#071A1D]"
      style={{ backgroundImage: "url('/bg.png')" }}
    >
      <style>{`
        @keyframes dp-rise { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: none; } }
        @keyframes dp-ping { 0% { transform: scale(1); opacity: 0.7; } 100% { transform: scale(2.2); opacity: 0; } }
        @keyframes dp-shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
        .dp-rise { animation: dp-rise 0.55s cubic-bezier(0.2,0.8,0.2,1) backwards; }
        .dp-ping { animation: dp-ping 1.8s cubic-bezier(0,0,0.2,1) infinite; }
        .dp-skel { background: linear-gradient(90deg,#dfeeee 25%,#f3fafa 50%,#dfeeee 75%); background-size: 800px 100%; animation: dp-shimmer 1.4s infinite linear; }
        .dark .dp-skel { background: linear-gradient(90deg,#12353a 25%,#1b4a50 50%,#12353a 75%); background-size: 800px 100%; }
        @media (prefers-reduced-motion: reduce) { .dp-rise, .dp-ping, .dp-skel { animation: none !important; } }
      `}</style>

      <div className="pointer-events-none absolute inset-0 hidden bg-gradient-to-br from-[#04151A]/95 via-[#07262B]/90 to-[#0A3338]/85 dark:block" />
      <div
        ref={glowRef}
        className="pointer-events-none fixed left-0 top-0 z-0 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(79,190,142,0.2),transparent_65%)] transition-transform duration-300 ease-out"
      />

      <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-5 px-6 py-6">
        {/* Back button */}
        <Link
          href="/home"
          className="group inline-flex w-fit items-center gap-2 rounded-full border border-white/80 bg-white/80 py-1.5 pl-1.5 pr-4 text-sm font-medium text-[#0D3B3E] shadow-sm backdrop-blur transition hover:-translate-x-0.5 hover:shadow-md active:scale-95 dark:border-white/10 dark:bg-white/10 dark:text-white"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#2E8B9E] to-[#4FBE8E] text-white shadow transition-transform duration-300 group-hover:-translate-x-1">
            <Icon>
              <path d="M19 12H5M11 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </Icon>
          </span>
          Back to search
        </Link>

        {isGuest && (
          <div className="dp-rise flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#2E8B9E]/20 bg-white/70 px-4 py-3 text-sm text-[#0D3B3E] backdrop-blur dark:border-white/10 dark:bg-white/10 dark:text-[#CDE9E6]">
            <span>You are browsing as a guest. Sign in to book a token.</span>
            <Link
              href="/?mode=signin"
              className="rounded-full bg-gradient-to-r from-[#2E8B9E] to-[#4FBE8E] px-4 py-1.5 text-xs font-medium text-white transition hover:brightness-105"
            >
              Sign in
            </Link>
          </div>
        )}
                {emergency && (
          <div
            role="alert"
            className="dp-rise flex items-start gap-3 rounded-2xl border border-[#E8734A]/40 bg-[#FDEDE6] px-4 py-3 text-sm text-[#9A3B1B] dark:bg-[#3A2218] dark:text-[#FFB59A]"
          >
            <Icon size={18} className="mt-0.5 flex-shrink-0">
              <path d="M12 9v4M12 17h.01" strokeLinecap="round" />
              <path d="M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" strokeLinejoin="round" />
            </Icon>
            <span>
              <span className="font-semibold">This can be serious.</span> If it is severe, sudden or
              getting worse, go to the nearest emergency room or call 112 (ambulance 108) right away.
              Do not wait for a token.
            </span>
          </div>
        )}
        {/* Header card */}
        <div className={`${card} dp-rise relative z-20 overflow-hidden p-5 md:p-6`}>
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#2E8B9E] via-[#4FBE8E] to-[#3FA9D6]" />

          <div className="flex items-start gap-4">
            <div className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center">
              <span className="dp-ping absolute inset-0 rounded-full bg-[#4FBE8E]/30" />
              <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#2E8B9E] to-[#4FBE8E] text-white shadow-lg">
                <Icon size={24}>
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" />
                </Icon>
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#2E8B9E] dark:text-[#6FE3B2]">
                Based on your symptom
              </p>
              <h1 className="font-serif text-2xl font-bold text-[#0D3B3E] md:text-3xl dark:text-white">
                {city ? 'Doctors who can help in ' + city : 'Doctors who can help'}
              </h1>
              <div aria-label={specialtyText} className="mt-2 flex flex-wrap gap-2">
                {orderedSpecialties.map((s) => (
                  <span
                    key={s.id}
                    className={`${grad(s.name)} rounded-full px-3 py-1 text-xs font-medium text-white shadow-sm`}
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {!loading && !error && allCount > 0 && (
            <>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
                {stats.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-white/70 px-3 py-1 text-[#0D3B3E] shadow-sm dark:bg-white/10 dark:text-[#CDE9E6]"
                  >
                    {t}
                  </span>
                ))}
              </div>

              <div className="mt-4 flex flex-col gap-3 border-t border-[#E3EEEC] pt-4 md:flex-row md:items-center dark:border-white/10">
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#2E8B9E] dark:text-[#6FE3B2]">
                    <Icon size={16}>
                      <circle cx="11" cy="11" r="7" />
                      <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
                    </Icon>
                  </span>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by doctor or clinic name"
                    className="w-full rounded-full border border-[#D6E4E4] bg-white/90 py-2.5 pl-10 pr-4 text-sm text-[#2A2A28] outline-none transition placeholder:text-[#8FA3A3] focus:border-[#2E8B9E] focus:ring-4 focus:ring-[#2E8B9E]/15 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-[#6F8F8F]"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => setSort('name')} className={pill(sort === 'name')}>
                    A to Z
                  </button>
                  <button onClick={() => setSort('rating')} className={pill(sort === 'rating')}>
                    Top rated
                  </button>
                  <button onClick={() => setTokenOnly((v) => !v)} className={pill(tokenOnly)}>
                    Token available
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {loading && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="dp-skel h-56 rounded-3xl" />
            ))}
          </div>
        )}

        {!loading && error ? (
          <p className="rounded-2xl bg-[#FDEAE6] px-4 py-3 text-sm text-[#B3402A] dark:bg-[#3A1A16] dark:text-[#FFB4A6]">
            {error}
          </p>
        ) : null}

        {!loading && !error && !specialtyParam ? (
          <p className={`px-1 text-sm ${muted}`}>
            Choose a symptom on the{' '}
            <Link href="/home" className="text-[#2E8B9E] underline dark:text-[#6FE3B2]">
              home page
            </Link>{' '}
            to see doctors.
          </p>
        ) : null}

        {!loading && !error && specialtyParam && allCount === 0 ? (
          <p className={`rounded-2xl bg-white/80 px-4 py-3 text-sm dark:bg-white/10 ${muted}`}>
            {city ? 'No doctors found yet in ' + city + '.' : 'No doctors found yet.'}
          </p>
        ) : null}

        {!loading && !error && allCount > 0 && totalCount === 0 ? (
          <div className={`flex flex-wrap items-center gap-3 rounded-2xl bg-white/80 px-4 py-3 text-sm dark:bg-white/10 ${muted}`}>
            No doctors match your filters.
            <button
              onClick={() => {
                setSearch('')
                setTokenOnly(false)
              }}
              className="font-medium text-[#2E8B9E] hover:underline dark:text-[#6FE3B2]"
            >
              Reset filters
            </button>
          </div>
        ) : null}

        {!loading && !error && totalCount > 0 ? (
          <div className="flex flex-col gap-4">
            <div className={`flex items-center gap-2 px-1 text-sm font-medium ${muted}`}>
              <span className="relative flex h-2 w-2">
                <span className="dp-ping absolute inline-flex h-full w-full rounded-full bg-[#4FBE8E]" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#4FBE8E]" />
              </span>
              Showing {totalCount} {totalCount === 1 ? 'doctor' : 'doctors'}
            </div>

            <div className="flex flex-col gap-10">
              {groups.map((group, gi) => {
                const isGP = group.specialty.name === GP
                // Labelled divider between the GP group and the specialists
                const showDivider = gi === 1 && !isGP && groups[0].specialty.name === GP
                return (
                  <section key={group.specialty.id}>
                    {showDivider && (
                      <div className="mb-8 flex items-center gap-3">
                        <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#3FA9D6]/60" />
                        <span className="rounded-full border border-[#3FA9D6]/30 bg-[#3FA9D6]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#2E7FA8] dark:text-[#7CC8EA]">
                          Specialists
                        </span>
                        <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#3FA9D6]/60" />
                      </div>
                    )}

                    <div
                      className={`mb-4 flex items-center gap-3 rounded-2xl border px-4 py-3 backdrop-blur ${
                        isGP ? 'border-[#4FBE8E]/30 bg-[#4FBE8E]/10' : 'border-[#3FA9D6]/30 bg-[#3FA9D6]/10'
                      }`}
                    >
                      <span
                        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-white shadow ${
                          isGP ? 'bg-gradient-to-br from-[#4FBE8E] to-[#2E8B9E]' : 'bg-gradient-to-br from-[#3FA9D6] to-[#3B6FD6]'
                        }`}
                      >
                        <Icon size={18}>
                          {isGP ? (
                            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                          ) : (
                            <path d={STAR} strokeLinejoin="round" />
                          )}
                        </Icon>
                      </span>
                      <div className="min-w-0 flex-1">
                        <h2 className="font-serif text-xl font-bold text-[#0D3B3E] dark:text-white">
                          {group.specialty.name}
                        </h2>
                        <p className={`text-xs ${muted}`}>
                          {isGP
                            ? 'Your first point of contact for everyday health concerns'
                            : 'Specialist care for this concern'}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          isGP
                            ? 'bg-[#4FBE8E]/20 text-[#1F7A55] dark:text-[#6FE3B2]'
                            : 'bg-[#3FA9D6]/20 text-[#2E7FA8] dark:text-[#7CC8EA]'
                        }`}
                      >
                        {isGP ? 'Start here' : 'Specialist'} · {group.doctors.length}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                      {group.doctors.map((d, i) => (
                        <DoctorCard
                          key={d.id}
                          index={i}
                          doctor={d}
                          isGuest={isGuest}
                          specialtyNames={[...(namesById.get(d.id) ?? [d.specialty_name])].sort(
                            compareSpecialtyNames
                          )}
                          onOpenReviews={() => setReviewTarget(d)}
                        />
                      ))}
                    </div>
                  </section>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>

      {reviewTarget ? (
        <ReviewsPanel
          open={true}
          doctorId={reviewTarget.id}
          doctorName={reviewTarget.name ?? 'Unnamed doctor'}
          commentsEnabled={!!reviewTarget.comments_enabled}
          onClose={() => setReviewTarget(null)}
          onChanged={refreshRatings}
        />
      ) : null}
    </div>
  )
}

function DoctorCard({
  doctor: d,
  specialtyNames,
  onOpenReviews,
  isGuest,
  index,
}: {
  doctor: Doctor
  specialtyNames: string[]
  onOpenReviews: () => void
  isGuest: boolean | null
  index: number
}) {
  const router = useRouter()
  const [booking, setBooking] = useState(false)
  const [bookError, setBookError] = useState('')

  const ratingNum = d.rating != null ? Number(d.rating) : null
  const hasRating = ratingNum != null && !Number.isNaN(ratingNum)
  const ratingCount = d.rating_count != null ? Number(d.rating_count) : 0
  const hasQueue =
    d.token_enabled && d.last_issued_token_number != null && d.current_token_number != null
  const queuePosition = hasQueue
    ? (d.last_issued_token_number as number) - (d.current_token_number as number)
    : null
  const initial = (d.name ?? '').replace(/^dr\.?\s*/i, '').trim().charAt(0).toUpperCase() || 'D'
  const strip = specialtyNames.includes(GP) ? gpGrad : spGrad

  async function handleBook() {
    setBooking(true)
    setBookError('')
    const { error } = await supabase.rpc('book_token', { p_doctor_id: d.id })
    if (error) {
      setBookError(error.message)
      setBooking(false)
      return
    }
    router.push('/my-token')
  }

  return (
    <div
      className="dp-rise group relative flex flex-col gap-3 overflow-hidden rounded-3xl border border-white/80 bg-white/90 p-5 pt-6 shadow-[0_6px_20px_rgba(13,59,62,0.08)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_18px_44px_rgba(13,59,62,0.18)] dark:border-white/10 dark:bg-[#0C2226]/90"
      style={{ animationDelay: `${Math.min(index, 12) * 60}ms` }}
    >
      <span className={`absolute inset-x-0 top-0 h-1.5 ${strip}`} />

      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full font-serif text-lg font-bold text-white shadow-md transition-transform duration-300 group-hover:scale-110 ${strip}`}
          >
            {initial}
          </div>
          <p className="text-lg font-bold leading-snug text-[#0D3B3E] dark:text-white">
            {d.name ?? 'Unnamed doctor'}
          </p>
        </div>

        {hasRating ? (
          <button
            type="button"
            onClick={onOpenReviews}
            aria-label="See reviews"
            className="flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-[#4FBE8E] to-[#2E8B9E] px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-[0.97]"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#F2C14E" stroke="#F2C14E" strokeWidth="1">
              <path d={STAR} />
            </svg>
            {(ratingNum as number).toFixed(1)}
            {ratingCount > 0 ? <span className="font-normal opacity-90">({ratingCount})</span> : null}
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenReviews}
            className="flex shrink-0 items-center gap-1 rounded-full border border-[#CFC9B8] px-2.5 py-1 text-xs font-medium text-[#7A8B90] transition hover:border-[#F2C14E] hover:text-[#B8892A] dark:border-white/20 dark:text-[#A9C6C4] dark:hover:text-[#F2C14E]"
          >
            <Icon size={12}>
              <path d={STAR} strokeLinejoin="round" />
            </Icon>
            Rate
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {specialtyNames.map((name) => (
          <span
            key={name}
            className={`${grad(name)} rounded-full px-3 py-1 text-xs font-medium text-white shadow-sm`}
          >
            {name}
          </span>
        ))}
      </div>

      {d.clinic_name || d.clinic_address ? (
        <div className="flex items-start gap-1.5">
          <Icon className="mt-0.5 flex-shrink-0 text-[#5FA89B]">
            <path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11z" />
            <circle cx="12" cy="10" r="2.5" />
          </Icon>
          <p className={`text-sm leading-snug ${muted}`}>
            {d.clinic_name}
            {d.clinic_address ? ', ' + d.clinic_address : ''}
          </p>
        </div>
      ) : null}

      <p className={`text-sm ${soft}`}>
        {d.qualifications}
        {d.experience_years != null ? ' \u00B7 ' + d.experience_years + ' yrs experience' : ''}
      </p>

      {d.consultation_hours ? (
        <div className="flex items-start gap-1.5">
          <Icon className={`mt-0.5 flex-shrink-0 ${soft}`}>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 3" />
          </Icon>
          <p className={`text-sm ${soft}`}>{d.consultation_hours}</p>
        </div>
      ) : null}

      {queuePosition != null ? (
        <p className="flex w-fit items-center gap-2 rounded-full bg-[#FDEDE6] px-3 py-1 text-sm font-medium text-[#E8734A] dark:bg-[#3A2218] dark:text-[#FF9C6E]">
          <span className="relative flex h-2 w-2">
            <span className="dp-ping absolute inline-flex h-full w-full rounded-full bg-[#E8734A]" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#E8734A]" />
          </span>
          {queuePosition <= 0 ? 'No wait, token available' : queuePosition + ' ahead in queue'}
        </p>
      ) : null}

      {bookError ? (
        <p className="rounded-lg bg-[#FDEAE6] px-2.5 py-1.5 text-xs text-[#B3402A] dark:bg-[#3A1A16] dark:text-[#FFB4A6]">
          {bookError}
        </p>
      ) : null}

      <div className="mt-auto flex flex-col gap-2 pt-1">
        <div className="flex items-center gap-2">
          <a
            href={directionsUrl(d)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#2E8B9E] to-[#4FBE8E] py-2.5 text-center text-sm font-medium text-white shadow-sm transition hover:brightness-110 active:scale-[0.98]"
          >
            <Icon>
              <path d="M3 11l18-8-8 18-2-8-8-2z" strokeLinecap="round" strokeLinejoin="round" />
            </Icon>
            Directions
          </a>

          {d.phone ? (
            <a
              href={'tel:' + d.phone}
              aria-label="Call clinic"
              className="flex items-center justify-center rounded-xl border border-[#4FBE8E] px-3 py-2.5 text-[#2E8B9E] transition hover:bg-[#4FBE8E] hover:text-white active:scale-[0.98] dark:text-[#6FE3B2]"
            >
              <Icon size={16}>
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </Icon>
            </a>
          ) : null}
        </div>

        {d.token_enabled && isGuest === true ? (
          <Link
            href="/?mode=signin"
            className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-[#2E8B9E]/40 py-2 text-sm font-medium text-[#2E8B9E] transition hover:border-[#2E8B9E] hover:bg-[#2E8B9E] hover:text-white active:scale-[0.98] dark:border-[#4FBE8E]/40 dark:text-[#6FE3B2] dark:hover:bg-[#4FBE8E] dark:hover:text-[#071A1D]"
          >
            <Icon>
              <rect x="5" y="11" width="14" height="9" rx="2.5" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round" />
            </Icon>
            Sign in to book a token
          </Link>
        ) : null}

        {d.token_enabled && isGuest === false ? (
          <button
            type="button"
            onClick={handleBook}
            disabled={booking}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#4FBE8E] to-[#2E8B9E] py-2.5 text-sm font-medium text-white shadow-sm transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
          >
            {booking ? (
              <>
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <circle cx="12" cy="12" r="9" strokeOpacity="0.3" />
                  <path d="M21 12a9 9 0 0 0-9-9" strokeLinecap="round" />
                </svg>
                Booking...
              </>
            ) : (
              'Book a token'
            )}
          </button>
        ) : null}
      </div>
    </div>
  )
}

export default function PickDoctorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#E6F5F2] dark:bg-[#071A1D]" />}>
      <PickDoctorContent />
    </Suspense>
  )
}