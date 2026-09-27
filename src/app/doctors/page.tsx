'use client'

// ============================================================
// IMPORTS
// ============================================================
import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

// ============================================================
// TYPES
// ============================================================
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
  clinic_name: string | null
  clinic_address: string | null
  city: string | null
  clinic_phone: string | null
}
type Specialty = { id: string; name: string }

// "A", "A and B", "A, B and C"
function joinNames(names: string[]) {
  if (names.length <= 1) return names.join('')
  return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1]
}

// Builds a Google Maps directions link from plain address text (no API key needed)
function directionsUrl(d: Doctor) {
  const parts = [d.clinic_name, d.clinic_address, d.city].filter(Boolean)
  const destination = encodeURIComponent(parts.join(', '))
  return 'https://www.google.com/maps/dir/?api=1&destination=' + destination
}

function callUrl(phone: string | null) {
  return phone ? 'tel:' + phone : undefined
}

// GP-first, then remaining specialties alphabetically
function orderSpecialties(specialties: Specialty[]) {
  return [...specialties].sort((a, b) => {
    const aGP = a.name === 'General Physician'
    const bGP = b.name === 'General Physician'
    if (aGP && !bGP) return -1
    if (bGP && !aGP) return 1
    return a.name.localeCompare(b.name)
  })
}

function PickDoctorContent() {
  const params = useSearchParams()
  const specialtyParam = params.get('specialty') ?? ''
  const city = params.get('city') ?? ''

  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const ids = specialtyParam.split(',').filter(Boolean)
    if (ids.length === 0) {
      setLoading(false)
      return
    }

    async function load() {
      setLoading(true)
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
  }, [specialtyParam, city])

  const orderedSpecialties = orderSpecialties(specialties)
  const groups = orderedSpecialties
    .map((s) => {
      const groupDoctors = doctors
        .filter((d) => d.specialty_id === s.id)
        .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
      return { specialty: s, doctors: groupDoctors }
    })
    .filter((g) => g.doctors.length > 0)

  const specialtyText = joinNames(specialties.map((s) => s.name))
  const totalCount = doctors.length

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#EFEEE6]">
      {/* Background glows, matching the home page */}
      <div className="pointer-events-none absolute -top-40 -left-32 w-[600px] h-[600px] rounded-full bg-[#3FA9D6] opacity-20 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-40 w-[550px] h-[550px] rounded-full bg-[#4FBE8E] opacity-20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-100px] left-1/3 w-[500px] h-[500px] rounded-full bg-[#F2C14E] opacity-[0.15] blur-3xl" />
      <div className="pointer-events-none absolute top-10 right-1/4 w-[350px] h-[350px] rounded-full bg-[#E8734A] opacity-[0.12] blur-3xl" />

      <div className="relative max-w-6xl mx-auto px-6 py-5 flex flex-col gap-4">
        <Link
          href="/home"
          className="inline-flex items-center gap-1 text-sm font-medium text-[#2E8B9E] hover:text-[#0D3B3E] transition w-fit"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to search
        </Link>

        {/* HEADER CARD */}
        <div className="relative z-20 bg-white/90 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgba(13,59,62,0.1)] p-5">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#3FA9D6] to-[#4FBE8E] flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-[#0D3B3E]">
                {city ? 'Doctors who can help in ' + city : 'Doctors who can help'}
              </h1>
              {specialtyText ? (
                <p className="text-base text-[#5C6B6F] mt-0.5">{specialtyText}</p>
              ) : null}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 px-1 text-sm text-[#5C6B6F]">
            <span className="w-4 h-4 rounded-full border-2 border-[#3FA9D6] border-t-transparent animate-spin" />
            Loading doctors...
          </div>
        ) : null}

        {!loading && error ? (
          <p className="text-sm text-[#B3402A] bg-[#FDEAE6] rounded-xl px-4 py-3">{error}</p>
        ) : null}

        {!loading && !error && !specialtyParam ? (
          <p className="text-sm text-[#7A8B90] px-1">
            Choose a symptom on the{' '}
            <Link href="/home" className="text-[#2E8B9E] underline">
              home page
            </Link>{' '}
            to see doctors.
          </p>
        ) : null}

        {!loading && !error && specialtyParam && totalCount === 0 ? (
          <p className="text-sm text-[#7A8B90] bg-white/80 rounded-xl px-4 py-3">
            {city ? 'No doctors found yet in ' + city + '.' : 'No doctors found yet.'}
          </p>
        ) : null}

        {!loading && !error && totalCount > 0 ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-1.5 px-1 text-sm font-medium text-[#5C6B6F]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4FBE8E]" />
              {totalCount} {totalCount === 1 ? 'doctor' : 'doctors'} found
            </div>

            <div className="flex flex-col gap-6">
              {groups.map((group, gi) => (
                <div key={group.specialty.id}>
                  {gi > 0 ? (
                    <div className="h-px bg-gradient-to-r from-transparent via-[#CFC9B8] to-transparent mb-6" />
                  ) : null}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {group.doctors.map((d) => (
                      <DoctorCard key={d.id} doctor={d} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ============================================================
// SMALL ICONS
// ============================================================
function PinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5FA89B" strokeWidth="2" className="flex-shrink-0 mt-0.5">
      <path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7A8B90" strokeWidth="2" className="flex-shrink-0 mt-0.5">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  )
}

function StarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="#F2C14E" stroke="#F2C14E" strokeWidth="1">
      <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-4-6.3 4 1.7-7-5.4-4.7 7.1-.6z" />
    </svg>
  )
}

// ============================================================
// DOCTOR CARD
// ============================================================
function DoctorCard({ doctor }: { doctor: Doctor }) {
  const d = doctor
  // Supabase returns Postgres "numeric" columns as strings, not JS numbers — convert explicitly
  const ratingNum = d.rating != null ? Number(d.rating) : null
  const hasRating = ratingNum != null && !Number.isNaN(ratingNum)
  const hasQueue =
    d.token_enabled && d.last_issued_token_number != null && d.current_token_number != null
  const queuePosition = hasQueue
    ? (d.last_issued_token_number as number) - (d.current_token_number as number)
    : null

  return (
    <div className="group relative bg-white rounded-2xl shadow-[0_4px_16px_rgba(13,59,62,0.08)] hover:shadow-[0_14px_36px_rgba(13,59,62,0.16)] hover:-translate-y-1 transition-all duration-200 p-5 flex flex-col gap-3 overflow-hidden">
      {/* soft corner glow, only visible on hover — the "dynamic" touch */}
      <div className="pointer-events-none absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br from-[#3FA9D6] to-[#4FBE8E] opacity-0 group-hover:opacity-10 blur-2xl transition-opacity duration-300" />

      <div className="flex items-start justify-between gap-3">
        <p className="text-lg font-bold text-[#1E2A2E] leading-snug">
          {d.name ?? 'Unnamed doctor'}
        </p>
        {hasRating ? (
          <span className="shrink-0 flex items-center gap-1 bg-gradient-to-r from-[#4FBE8E] to-[#3FA9D6] text-white text-xs font-semibold rounded-full px-2.5 py-1 shadow-sm">
            <StarIcon />
            {ratingNum!.toFixed(1)}
          </span>
        ) : null}
      </div>

      <span className="self-start bg-gradient-to-r from-[#3FA9D6] to-[#4FBE8E] text-white text-xs font-medium rounded-full px-3 py-1 shadow-sm">
        {d.specialty_name}
      </span>

      {d.clinic_name || d.clinic_address ? (
        <div className="flex items-start gap-1.5">
          <PinIcon />
          <p className="text-sm text-[#5C6B6F] leading-snug">
            {d.clinic_name}
            {d.clinic_address ? ', ' + d.clinic_address : ''}
          </p>
        </div>
      ) : null}

      <p className="text-sm text-[#7A8B90]">
        {d.qualifications}
        {d.experience_years != null ? ' \u00B7 ' + d.experience_years + ' yrs experience' : ''}
      </p>

      {d.consultation_hours ? (
        <div className="flex items-start gap-1.5">
          <ClockIcon />
          <p className="text-sm text-[#7A8B90]">{d.consultation_hours}</p>
        </div>
      ) : null}

      {queuePosition != null ? (
        <p className="text-sm font-medium text-[#E8734A] bg-[#FDEDE6] rounded-lg px-2.5 py-1 w-fit">
          {queuePosition <= 0 ? 'No wait, token available' : queuePosition + ' ahead in queue'}
        </p>
      ) : null}

      <div className="flex items-center gap-2 mt-1">
        <a
          href={directionsUrl(d)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 text-center bg-gradient-to-r from-[#3FA9D6] to-[#2E8B9E] text-white text-sm font-medium rounded-xl py-2.5 shadow-sm hover:brightness-110 active:scale-[0.98] transition"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M3 11l18-8-8 18-2-8-8-2z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Directions
        </a>

        {d.phone ? (
          <a
            href={callUrl(d.phone)}
            className="flex items-center justify-center border border-[#4FBE8E] text-[#4FBE8E] rounded-xl px-3 py-2.5 hover:bg-[#4FBE8E] hover:text-white active:scale-[0.98] transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </a>
        ) : null}

        {d.token_enabled ? (
          <button
            type="button"
            className="flex items-center justify-center border border-[#E8734A] text-[#E8734A] text-sm font-medium rounded-xl px-3 py-2.5 hover:bg-[#E8734A] hover:text-white transition"
            onClick={() => alert('Booking coming soon')}
          >
            Book
          </button>
        ) : null}
      </div>
    </div>
  )
}

// useSearchParams must sit inside a Suspense boundary or the Vercel build fails
export default function PickDoctorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#EFEEE6]" />}>
      <PickDoctorContent />
    </Suspense>
  )
}