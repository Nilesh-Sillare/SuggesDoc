'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type Specialty = { id: string; name: string }
type City = { id: string; Name: string }
type TokenRow = {
  id: string
  token_number: number
  patient_name: string | null
  patient_id: string | null
  Status: string
  created_at: string
}

const card =
  'rounded-3xl border border-white/80 bg-white/85 shadow-[0_16px_50px_rgba(13,59,62,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-[#0C2226]/85 dark:shadow-[0_16px_50px_rgba(0,0,0,0.45)]'
const muted = 'text-[#5C6B6F] dark:text-[#A9C6C4]'
const input =
  'w-full rounded-xl border border-[#D6E4E4] bg-white/90 px-4 py-2.5 text-sm text-[#2A2A28] outline-none transition placeholder:text-[#8FA3A3] focus:border-[#2E8B9E] focus:ring-4 focus:ring-[#2E8B9E]/15 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-[#6F8F8F] dark:[&>option]:bg-[#0C2226]'

function Icon({
  children,
  size = 16,
  className,
}: {
  children: React.ReactNode
  size?: number
  className?: string
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      {children}
    </svg>
  )
}

function timeIST(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })
}

function istToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

export default function DoctorDashboard() {
  const router = useRouter()
  const glowRef = useRef<HTMLDivElement>(null)

  // identity
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [doctorId, setDoctorId] = useState<string | null>(null)
  const [verificationStatus, setVerificationStatus] = useState('')

  // profile
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [qualifications, setQualifications] = useState('')
  const [experienceYears, setExperienceYears] = useState('')
  const [consultationHours, setConsultationHours] = useState('')
  const [tokenEnabled, setTokenEnabled] = useState(false)

  // clinic
  const [clinicId, setClinicId] = useState<string | null>(null)
  const [clinicName, setClinicName] = useState('')
  const [clinicAddress, setClinicAddress] = useState('')
  const [clinicPhone, setClinicPhone] = useState('')
  const [clinicCity, setClinicCity] = useState('')

  // lookups
  const [allSpecialties, setAllSpecialties] = useState<Specialty[]>([])
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([])
  const [cities, setCities] = useState<City[]>([])

  // queue
  const [lastIssued, setLastIssued] = useState(0)
  const [tokens, setTokens] = useState<TokenRow[]>([])
  const [walkinName, setWalkinName] = useState('')
  const [showDone, setShowDone] = useState(false)
  const [busy, setBusy] = useState('')
  const [live, setLive] = useState(false)
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null)

  // reset modal
  const [resetOpen, setResetOpen] = useState(false)
  const [resetPassword, setResetPassword] = useState('')
  const [resetError, setResetError] = useState('')

  // edit profile
  const [editOpen, setEditOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  function flash(text: string, error = false) {
    setNotice({ text, error })
    setTimeout(() => setNotice(null), 3500)
  }

  // ============================================================
  // LOAD EVERYTHING ON MOUNT
  // ============================================================
  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser()
      const user = authData.user
      if (!user) {
        router.push('/')
        return
      }
      setUserId(user.id)
      setUserEmail(user.email ?? '')

      const { data: userRow } = await supabase
        .from('users')
        .select('name, phone, role')
        .eq('id', user.id)
        .single()

      if (userRow?.role !== 'doctor') {
        router.push('/home')
        return
      }
      setName(userRow.name ?? '')
      setPhone(userRow.phone ?? '')

      const { data: doctorRow } = await supabase
        .from('Doctors')
        .select('id, clinic_id, qualifications, experience_years, consultation_hours, token_enabled, verification_status')
        .eq('user_id', user.id)
        .single()

      if (!doctorRow) {
        setLoading(false)
        return
      }

      setDoctorId(doctorRow.id)
      setClinicId(doctorRow.clinic_id)
      setQualifications(doctorRow.qualifications ?? '')
      setExperienceYears(doctorRow.experience_years != null ? String(doctorRow.experience_years) : '')
      setConsultationHours(doctorRow.consultation_hours ?? '')
      setTokenEnabled(!!doctorRow.token_enabled)
      setVerificationStatus(doctorRow.verification_status ?? 'pending')

      if (doctorRow.clinic_id) {
        const { data: clinicRow } = await supabase
          .from('Clinics')
          .select('Name, Adress, City, Phone')
          .eq('id', doctorRow.clinic_id)
          .single()
        if (clinicRow) {
          setClinicName(clinicRow.Name ?? '')
          setClinicAddress(clinicRow.Adress ?? '')
          setClinicCity(clinicRow.City ?? '')
          setClinicPhone(clinicRow.Phone ?? '')
        }
      }

      const { data: dsRows } = await supabase
        .from('DoctorSpecialty')
        .select('specialty_id')
        .eq('doctor_id', doctorRow.id)
      setSelectedSpecialties((dsRows ?? []).map((r) => r.specialty_id))

      await loadQueue(doctorRow.id)
      setLoading(false)
    }

    async function loadLookups() {
      const { data: specData } = await supabase.from('Speciality').select('id, name').order('name')
      setAllSpecialties(specData ?? [])
      const { data: cityData } = await supabase.from('City').select('id, Name').order('Name')
      setCities(cityData ?? [])
    }

    load()
    loadLookups()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Today's tokens (IST) plus anything still waiting or being served
  async function loadQueue(docId: string) {
    const [docRes, tokRes] = await Promise.all([
      supabase.from('Doctors').select('last_issued_token_number').eq('id', docId).single(),
      supabase
        .from('tokens')
        .select('id, token_number, patient_name, patient_id, Status, created_at')
        .eq('doctor_id', docId)
        .or(`Status.in.(Waiting,Serving),Date.eq.${istToday()}`)
        .order('token_number'),
    ])
    if (docRes.data) setLastIssued(Number(docRes.data.last_issued_token_number) || 0)
    if (tokRes.data) setTokens(tokRes.data as TokenRow[])
  }

  // ============================================================
  // LIVE UPDATES
  // ============================================================
  useEffect(() => {
    if (!doctorId) return
    const id = doctorId
    let timer: ReturnType<typeof setTimeout> | null = null

    function refresh() {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => loadQueue(id), 250)
    }

    const channel = supabase
      .channel('doctor-queue-' + id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tokens', filter: `doctor_id=eq.${id}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Doctors', filter: `id=eq.${id}` }, refresh)
      .subscribe((status) => setLive(status === 'SUBSCRIBED'))

    const poll = setInterval(() => loadQueue(id), 15000)

    return () => {
      clearInterval(poll)
      if (timer) clearTimeout(timer)
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId])

  // ============================================================
  // QUEUE ACTIONS (all go through database functions)
  // ============================================================
  async function handleCallNext() {
    if (!doctorId) return
    setBusy('next')
    const { data, error } = await supabase.rpc('call_next_token')
    setBusy('')
    if (error) {
      flash(error.message, true)
      return
    }
    await loadQueue(doctorId)
    flash(data ? `Now serving token #${data}` : 'Queue is clear')
  }

  async function handleAddWalkin() {
    if (!doctorId || !walkinName.trim()) return
    setBusy('walkin')
    const { data, error } = await supabase.rpc('add_walkin_token', { p_name: walkinName.trim() })
    setBusy('')
    if (error) {
      flash(error.message, true)
      return
    }
    flash(`Token #${data} added for ${walkinName.trim()}`)
    setWalkinName('')
    await loadQueue(doctorId)
  }

  async function handleConfirmReset() {
    if (!doctorId || !userEmail) return
    setResetError('')
    setBusy('reset')

    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: resetPassword,
    })
    if (authErr) {
      setBusy('')
      setResetError('Incorrect password.')
      return
    }

    const { error } = await supabase.rpc('reset_queue')
    setBusy('')
    if (error) {
      setResetError(error.message)
      return
    }

    setResetOpen(false)
    setResetPassword('')
    await loadQueue(doctorId)
    flash('Queue reset. Fresh start!')
  }

  async function toggleTokens() {
    if (!doctorId) return
    const next = !tokenEnabled
    setTokenEnabled(next)
    const { error } = await supabase.from('Doctors').update({ token_enabled: next }).eq('id', doctorId)
    if (error) {
      setTokenEnabled(!next)
      flash(error.message, true)
    } else {
      flash(next ? 'Patients can now book tokens' : 'Token booking paused')
    }
  }

  // ============================================================
  // SAVE PROFILE (unchanged logic)
  // ============================================================
  async function handleSaveProfile() {
    if (!userId) return
    setSaving(true)
    setSaveMessage('')

    try {
      const { error: userErr } = await supabase.from('users').update({ name, phone }).eq('id', userId)
      if (userErr) throw userErr

      let resolvedClinicId = clinicId
      if (resolvedClinicId) {
        const { error: clinicErr } = await supabase
          .from('Clinics')
          .update({ Name: clinicName, Adress: clinicAddress, City: clinicCity, Phone: clinicPhone })
          .eq('id', resolvedClinicId)
        if (clinicErr) throw clinicErr
      } else {
        const { data: newClinic, error: clinicErr } = await supabase
          .from('Clinics')
          .insert({
            Name: clinicName,
            Adress: clinicAddress,
            City: clinicCity,
            Phone: clinicPhone,
            owner_id: userId,
          })
          .select('id')
          .single()
        if (clinicErr) throw clinicErr
        resolvedClinicId = newClinic.id
        setClinicId(newClinic.id)
      }

      if (!doctorId) throw new Error('Doctor profile not found.')
      const { error: doctorErr } = await supabase
        .from('Doctors')
        .update({
          clinic_id: resolvedClinicId,
          qualifications,
          experience_years: experienceYears ? Number(experienceYears) : null,
          consultation_hours: consultationHours,
          token_enabled: tokenEnabled,
          specialty_id: selectedSpecialties[0] ?? null,
        })
        .eq('id', doctorId)
      if (doctorErr) throw doctorErr

      await supabase.from('DoctorSpecialty').delete().eq('doctor_id', doctorId)
      if (selectedSpecialties.length > 0) {
        const rows = selectedSpecialties.map((specialty_id) => ({ doctor_id: doctorId, specialty_id }))
        const { error: dsErr } = await supabase.from('DoctorSpecialty').insert(rows)
        if (dsErr) throw dsErr
      }

      setSaveMessage('Profile saved.')
      setTimeout(() => {
        setEditOpen(false)
        setSaveMessage('')
      }, 900)
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : 'Could not save profile.')
    } finally {
      setSaving(false)
    }
  }

  function toggleSpecialty(id: string) {
    setSelectedSpecialties((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))
  }

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    if (glowRef.current) {
      glowRef.current.style.transform = `translate3d(${e.clientX - 260}px, ${e.clientY - 260}px, 0)`
    }
  }

  // ============================================================
  // DERIVED
  // ============================================================
  const serving = tokens.find((t) => t.Status === 'Serving') ?? null
  const waiting = tokens.filter((t) => t.Status === 'Waiting')
  const done = tokens.filter((t) => t.Status === 'Done')
  const canCall = waiting.length > 0 || !!serving
  const callLabel = serving
    ? waiting.length > 0
      ? 'Finish & call next'
      : 'Finish current patient'
    : 'Call next patient'
  const selectedSpecialtyNames = allSpecialties.filter((s) => selectedSpecialties.includes(s.id)).map((s) => s.name)
  const isVerified = verificationStatus === 'verified'

  // ============================================================
  // RENDER
  // ============================================================
  const shell = (children: React.ReactNode) => (
    <div
      onMouseMove={onMove}
      className="relative min-h-screen overflow-hidden bg-[#E6F5F2] bg-cover bg-center bg-no-repeat dark:bg-[#071A1D]"
      style={{ backgroundImage: "url('/bg.png')" }}
    >
      <style>{`
        @keyframes dd-rise { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: none; } }
        @keyframes dd-ping { 0% { transform: scale(1); opacity: 0.7; } 100% { transform: scale(2.6); opacity: 0; } }
        @keyframes dd-slide { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes dd-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes dd-toast { from { opacity: 0; transform: translate(-50%, 12px); } to { opacity: 1; transform: translate(-50%, 0); } }
        @keyframes dd-shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
        .dd-rise { animation: dd-rise 0.55s cubic-bezier(0.2,0.8,0.2,1) backwards; }
        .dd-ping { animation: dd-ping 1.8s cubic-bezier(0,0,0.2,1) infinite; }
        .dd-slide { animation: dd-slide 0.25s ease-out; }
        .dd-fade { animation: dd-fade 0.2s ease-out; }
        .dd-toast { animation: dd-toast 0.3s ease-out; }
        .dd-skel { background: linear-gradient(90deg,#dfeeee 25%,#f3fafa 50%,#dfeeee 75%); background-size: 800px 100%; animation: dd-shimmer 1.4s infinite linear; }
        .dark .dd-skel { background: linear-gradient(90deg,#12353a 25%,#1b4a50 50%,#12353a 75%); background-size: 800px 100%; }
        @media (prefers-reduced-motion: reduce) { .dd-rise, .dd-ping, .dd-slide, .dd-fade, .dd-toast, .dd-skel { animation: none !important; } }
      `}</style>
      <div className="pointer-events-none absolute inset-0 hidden bg-gradient-to-br from-[#04151A]/95 via-[#07262B]/90 to-[#0A3338]/85 dark:block" />
      <div
        ref={glowRef}
        className="pointer-events-none fixed left-0 top-0 z-0 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(79,190,142,0.2),transparent_65%)] transition-transform duration-300 ease-out"
      />
      {children}
    </div>
  )

  if (loading) {
    return shell(
      <div className="relative z-10 mx-auto flex max-w-4xl flex-col gap-5 px-6 py-8">
        <div className="dd-skel h-12 w-72 rounded-2xl" />
        <div className="dd-skel h-64 rounded-3xl" />
        <div className="dd-skel h-40 rounded-3xl" />
      </div>
    )
  }

  if (!doctorId) {
    return shell(
      <div className="relative z-10 mx-auto max-w-md px-6 py-16">
        <div className={`${card} p-8 text-center`}>
          <p className="font-serif text-xl font-bold text-[#0D3B3E] dark:text-white">Doctor profile not found</p>
          <p className={`mt-1 text-sm ${muted}`}>Your account has no doctor profile yet. Please contact support.</p>
        </div>
      </div>
    )
  }

  return shell(
    <>
      <div className="relative z-10 mx-auto flex max-w-4xl flex-col gap-5 px-6 py-8">
        {/* Title */}
        <div className="dd-rise flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#2E8B9E] dark:text-[#6FE3B2]">
              Doctor dashboard
            </p>
            <h1 className="font-serif text-3xl font-bold text-[#0D3B3E] dark:text-white">
              {name ? `Welcome, ${name}` : 'Welcome'}
            </h1>
          </div>
          <span
            className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
              live
                ? 'bg-[#4FBE8E]/15 text-[#1F7A55] dark:text-[#6FE3B2]'
                : 'bg-white/70 text-[#7A8B90] dark:bg-white/10 dark:text-[#A9C6C4]'
            }`}
          >
            <span className="relative flex h-2 w-2">
              {live && <span className="dd-ping absolute inline-flex h-full w-full rounded-full bg-[#4FBE8E]" />}
              <span className={`relative inline-flex h-2 w-2 rounded-full ${live ? 'bg-[#4FBE8E]' : 'bg-[#B8C4C4]'}`} />
            </span>
            {live ? 'Live' : 'Updating every 15s'}
          </span>
        </div>

        {/* Verification banner */}
        <div
          className={`dd-rise rounded-2xl px-4 py-3 text-sm font-medium ${
            isVerified
              ? 'bg-[#4FBE8E]/15 text-[#1F7A55] dark:text-[#6FE3B2]'
              : 'bg-[#FDF6E3] text-[#9A7B2E] dark:bg-[#3A3318] dark:text-[#E8D79A]'
          }`}
        >
          {isVerified
            ? 'Verified. Patients can find you' + (tokenEnabled ? ' and book tokens.' : ', but token booking is paused.')
            : "Pending review: patients can't see you until you're verified."}
        </div>

        {/* NOW SERVING */}
        <div
          className="dd-rise relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0D3B3E] via-[#14595F] to-[#2E8B9E] p-6 text-white shadow-[0_20px_60px_rgba(13,59,62,0.35)]"
          style={{ animationDelay: '0.05s' }}
        >
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#4FBE8E] opacity-25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-[#3FA9D6] opacity-20 blur-3xl" />

          <div className="relative flex flex-wrap items-center justify-between gap-6">
            <div>
              <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#BFF3E3]">
                {serving && (
                  <span className="relative flex h-2 w-2">
                    <span className="dd-ping absolute inline-flex h-full w-full rounded-full bg-[#6FE3B2]" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#6FE3B2]" />
                  </span>
                )}
                Now serving
              </p>
              <p className="font-serif text-7xl font-bold leading-none">{serving ? serving.token_number : '-'}</p>
              <p className="mt-2 text-lg font-medium">
                {serving ? serving.patient_name ?? 'SuggestDoc patient' : 'No one is being served'}
              </p>
              {serving && (
                <span className="mt-2 inline-block rounded-full bg-white/15 px-3 py-0.5 text-xs">
                  {serving.patient_id ? 'Booked on SuggestDoc' : 'Walk-in'}
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { v: waiting.length, l: 'Waiting' },
                { v: done.length, l: 'Done' },
                { v: lastIssued, l: 'Issued' },
              ].map((s) => (
                <div key={s.l} className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur">
                  <p className="font-serif text-3xl font-bold">{s.v}</p>
                  <p className="text-xs text-[#BFF3E3]">{s.l}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative mt-6 flex flex-col gap-2 sm:flex-row">
            <button
              onClick={handleCallNext}
              disabled={!canCall || busy === 'next'}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white py-3 text-sm font-semibold text-[#0D3B3E] shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98] disabled:opacity-40 disabled:hover:translate-y-0"
            >
              {busy === 'next' ? (
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <circle cx="12" cy="12" r="9" strokeOpacity="0.3" />
                  <path d="M21 12a9 9 0 0 0-9-9" strokeLinecap="round" />
                </svg>
              ) : (
                <Icon>
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </Icon>
              )}
              {callLabel}
            </button>
            <button
              onClick={() => setResetOpen(true)}
              className="rounded-2xl border border-white/30 px-5 py-3 text-sm font-medium text-white transition hover:border-[#FFB4A6] hover:bg-[#FF9C88]/15 hover:text-[#FFB4A6]"
            >
              Reset queue
            </button>
          </div>
        </div>

        {/* WALK-IN */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleAddWalkin()
          }}
          className={`${card} dd-rise p-5`}
          style={{ animationDelay: '0.1s' }}
        >
          <h2 className="mb-3 font-serif text-lg font-bold text-[#0D3B3E] dark:text-white">Add a walk-in</h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={walkinName}
              onChange={(e) => setWalkinName(e.target.value)}
              placeholder="Patient name (no account needed)"
              className={input}
            />
            <button
              type="submit"
              disabled={!walkinName.trim() || busy === 'walkin'}
              className="whitespace-nowrap rounded-xl bg-gradient-to-r from-[#2E8B9E] to-[#4FBE8E] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:brightness-110 active:scale-[0.98] disabled:opacity-40"
            >
              {busy === 'walkin' ? 'Adding...' : 'Add to queue'}
            </button>
          </div>
        </form>

        {/* QUEUE */}
        <div className={`${card} dd-rise p-5`} style={{ animationDelay: '0.15s' }}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-serif text-lg font-bold text-[#0D3B3E] dark:text-white">Waiting queue</h2>
            <span className="rounded-full bg-[#3FA9D6]/15 px-3 py-1 text-xs font-semibold text-[#2E7FA8] dark:text-[#7CC8EA]">
              {waiting.length} {waiting.length === 1 ? 'patient' : 'patients'}
            </span>
          </div>

          {waiting.length === 0 ? (
            <p className={`py-6 text-center text-sm ${muted}`}>
              Nobody is waiting. New bookings will show up here live.
            </p>
          ) : (
            <div className="flex max-h-96 flex-col gap-2 overflow-y-auto pr-1">
              {waiting.map((t, i) => (
                <div key={t.id} className="flex items-center gap-3 rounded-2xl bg-white/70 px-4 py-3 dark:bg-white/5">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2E8B9E] to-[#4FBE8E] font-serif text-sm font-bold text-white">
                    {t.token_number}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#0D3B3E] dark:text-white">
                      {t.patient_name ?? 'SuggestDoc patient'}
                    </p>
                    <p className={`text-xs ${muted}`}>Booked {timeIST(t.created_at)}</p>
                  </div>
                  {i === 0 && (
                    <span className="rounded-full bg-[#4FBE8E]/15 px-2.5 py-0.5 text-xs font-semibold text-[#1F7A55] dark:text-[#6FE3B2]">
                      Next
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      t.patient_id
                        ? 'bg-[#3FA9D6]/15 text-[#2E7FA8] dark:text-[#7CC8EA]'
                        : 'bg-[#E8734A]/15 text-[#C25A34] dark:text-[#FF9C6E]'
                    }`}
                  >
                    {t.patient_id ? 'App' : 'Walk-in'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {done.length > 0 && (
            <div className="mt-4 border-t border-[#E3EEEC] pt-3 dark:border-white/10">
              <button
                onClick={() => setShowDone((v) => !v)}
                className="flex w-full items-center justify-between text-sm font-medium text-[#2E8B9E] dark:text-[#6FE3B2]"
              >
                Completed today ({done.length})
                <Icon size={14} className={`transition-transform ${showDone ? 'rotate-180' : ''}`}>
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </Icon>
              </button>
              {showDone && (
                <div className="dd-fade mt-2 flex flex-col gap-1.5">
                  {[...done].reverse().map((t) => (
                    <div
                      key={t.id}
                      className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${muted}`}
                    >
                      <span>
                        #{t.token_number} · {t.patient_name ?? 'SuggestDoc patient'}
                      </span>
                      <span className="text-xs">Done</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* TOKEN SWITCH */}
        <div className={`${card} dd-rise flex items-center justify-between gap-4 p-5`} style={{ animationDelay: '0.2s' }}>
          <div>
            <p className="font-serif text-lg font-bold text-[#0D3B3E] dark:text-white">Accepting tokens</p>
            <p className={`text-sm ${muted}`}>
              {tokenEnabled ? 'Patients can book a token with you online.' : 'Online booking is paused.'}
            </p>
          </div>
          <button
            onClick={toggleTokens}
            role="switch"
            aria-checked={tokenEnabled}
            aria-label="Accepting tokens"
            className={`relative h-8 w-14 flex-shrink-0 rounded-full transition-colors ${
              tokenEnabled ? 'bg-gradient-to-r from-[#2E8B9E] to-[#4FBE8E]' : 'bg-[#C9D3D3] dark:bg-white/20'
            }`}
          >
            <span
              className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${
                tokenEnabled ? 'left-7' : 'left-1'
              }`}
            />
          </button>
        </div>

        {/* PROFILE SUMMARY */}
        <div className={`${card} dd-rise p-5`} style={{ animationDelay: '0.25s' }}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-lg font-bold text-[#0D3B3E] dark:text-white">Your profile</h2>
            <button
              onClick={() => setEditOpen(true)}
              className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#2E8B9E] to-[#4FBE8E] px-4 py-1.5 text-sm font-medium text-white shadow-sm transition hover:brightness-110 active:scale-95"
            >
              <Icon size={13}>
                <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinecap="round" strokeLinejoin="round" />
              </Icon>
              Edit profile
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-lg font-bold text-[#0D3B3E] dark:text-white">{name || 'Unnamed doctor'}</p>

            {selectedSpecialtyNames.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedSpecialtyNames.map((n) => (
                  <span
                    key={n}
                    className="rounded-full bg-gradient-to-r from-[#3FA9D6] to-[#4FBE8E] px-3 py-1 text-xs font-medium text-white shadow-sm"
                  >
                    {n}
                  </span>
                ))}
              </div>
            )}

            {(qualifications || experienceYears) && (
              <p className={`text-sm ${muted}`}>
                {qualifications}
                {experienceYears ? ` · ${experienceYears} yrs experience` : ''}
              </p>
            )}
            {phone && <p className={`text-sm ${muted}`}>Phone: {phone}</p>}
            {(clinicName || clinicAddress) && (
              <p className={`text-sm leading-snug ${muted}`}>
                {clinicName}
                {clinicAddress ? `, ${clinicAddress}` : ''}
                {clinicCity ? `, ${clinicCity}` : ''}
              </p>
            )}
            {consultationHours && <p className={`text-sm ${muted}`}>Hours: {consultationHours}</p>}
          </div>
        </div>
      </div>

      {/* Toast */}
      {notice && (
        <div
          className={`dd-toast fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full px-5 py-2.5 text-sm font-medium shadow-xl ${
            notice.error ? 'bg-[#B3402A] text-white' : 'bg-[#0D3B3E] text-white'
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* EDIT PROFILE SLIDE-OVER */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="dd-fade absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setEditOpen(false)} />
          <div className="dd-slide relative h-full w-full max-w-md overflow-y-auto bg-[#EFF8F6] shadow-2xl dark:bg-[#071A1D]">
            <div className="flex flex-col gap-4 p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-xl font-bold text-[#0D3B3E] dark:text-white">Edit profile</h2>
                <button
                  onClick={() => setEditOpen(false)}
                  aria-label="Close"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[#7A8B90] transition hover:bg-white dark:text-[#A9C6C4] dark:hover:bg-white/10"
                >
                  <Icon>
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                  </Icon>
                </button>
              </div>

              <div className={`${card} flex flex-col gap-3 p-5`}>
                <input type="text" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} className={input} />
                <input
                  type="tel"
                  placeholder="Phone (shown to patients)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={input}
                />

                <p className="mt-1 text-sm font-medium text-[#0D3B3E] dark:text-white">Specialties</p>
                <div className="flex flex-wrap gap-2">
                  {allSpecialties.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleSpecialty(s.id)}
                      className={`rounded-full border px-3 py-1.5 text-sm transition active:scale-95 ${
                        selectedSpecialties.includes(s.id)
                          ? 'border-transparent bg-gradient-to-r from-[#2E8B9E] to-[#4FBE8E] text-white shadow-sm'
                          : 'border-[#D6E4E4] text-[#5C6B6F] hover:border-[#2E8B9E] dark:border-white/15 dark:text-[#A9C6C4]'
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Qualifications (e.g. MBBS, MD)"
                  value={qualifications}
                  onChange={(e) => setQualifications(e.target.value)}
                  className={input}
                />
                <input
                  type="number"
                  placeholder="Years of experience"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                  className={input}
                />
                <input
                  type="text"
                  placeholder="Consultation hours (e.g. Mon-Sat, 10am-2pm)"
                  value={consultationHours}
                  onChange={(e) => setConsultationHours(e.target.value)}
                  className={input}
                />

                <p className="mt-1 text-sm font-medium text-[#0D3B3E] dark:text-white">Clinic</p>
                <input type="text" placeholder="Clinic name" value={clinicName} onChange={(e) => setClinicName(e.target.value)} className={input} />
                <input type="tel" placeholder="Clinic phone" value={clinicPhone} onChange={(e) => setClinicPhone(e.target.value)} className={input} />
                <input type="text" placeholder="Clinic address" value={clinicAddress} onChange={(e) => setClinicAddress(e.target.value)} className={input} />
                <select value={clinicCity} onChange={(e) => setClinicCity(e.target.value)} className={input}>
                  <option value="">Select district</option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.Name}>
                      {c.Name}
                    </option>
                  ))}
                </select>

                <label className="mt-1 flex w-fit cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={tokenEnabled}
                    onChange={(e) => setTokenEnabled(e.target.checked)}
                    className="h-4 w-4 accent-[#2E8B9E]"
                  />
                  <span className="text-sm text-[#2A2A28] dark:text-[#DCEEEC]">Enable online token queue</span>
                </label>

                {saveMessage && <p className={`text-sm ${muted}`}>{saveMessage}</p>}

                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="mt-1 w-full rounded-xl bg-gradient-to-r from-[#2E8B9E] to-[#4FBE8E] py-3 text-sm font-medium text-white shadow-md transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save profile'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RESET QUEUE MODAL */}
      {resetOpen && (
        <div className="dd-fade fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6 backdrop-blur-[2px]">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#0C2226]">
            <h3 className="mb-2 font-serif text-xl font-bold text-[#0D3B3E] dark:text-white">Reset the queue?</h3>
            <p className={`mb-4 text-sm ${muted}`}>
              Everyone still waiting is cancelled and the counters go back to zero. Enter your password to confirm.
            </p>
            <input
              type="password"
              placeholder="Account password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              className={`${input} mb-2`}
            />
            {resetError && <p className="mb-2 text-sm text-[#B3402A] dark:text-[#FFB4A6]">{resetError}</p>}
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => {
                  setResetOpen(false)
                  setResetPassword('')
                  setResetError('')
                }}
                className="flex-1 rounded-xl border border-[#D6E4E4] py-2.5 text-sm font-medium text-[#5C6B6F] transition hover:bg-[#F3FBF6] dark:border-white/15 dark:text-[#A9C6C4] dark:hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReset}
                disabled={!resetPassword || busy === 'reset'}
                className="flex-1 rounded-xl bg-[#B3402A] py-2.5 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50"
              >
                {busy === 'reset' ? 'Resetting...' : 'Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}