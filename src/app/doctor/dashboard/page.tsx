'use client'

// ============================================================
// IMPORTS
// ============================================================
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

// ============================================================
// TYPES
// ============================================================
type Specialty = { id: string; name: string }
type City = { id: string; Name: string }
type TokenRow = {
  id: string
  token_number: number
  patient_name: string | null
  Status: string
}

// ============================================================
// SMALL ICONS (matching Pick Doctor card style)
// ============================================================
function PhoneIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5FA89B" strokeWidth="2" className="flex-shrink-0">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}
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
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7A8B90" strokeWidth="2" className="flex-shrink-0">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  )
}
function BadgeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3FA9D6" strokeWidth="2" className="flex-shrink-0">
      <path d="M12 15l-3.5 2 1-4-3-2.6 4-.3L12 6l1.5 4.1 4 .3-3 2.6 1 4z" />
    </svg>
  )
}

export default function DoctorDashboard() {
  const router = useRouter()

  // ---------------- auth / identity ----------------
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [doctorId, setDoctorId] = useState<string | null>(null)
  const [verificationStatus, setVerificationStatus] = useState('')

  // ---------------- profile fields ----------------
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [qualifications, setQualifications] = useState('')
  const [experienceYears, setExperienceYears] = useState('')
  const [consultationHours, setConsultationHours] = useState('')
  const [tokenEnabled, setTokenEnabled] = useState(false)

  // ---------------- clinic fields ----------------
  const [clinicId, setClinicId] = useState<string | null>(null)
  const [clinicName, setClinicName] = useState('')
  const [clinicAddress, setClinicAddress] = useState('')
  const [clinicPhone, setClinicPhone] = useState('')
  const [clinicCity, setClinicCity] = useState('')

  // ---------------- lookups ----------------
  const [allSpecialties, setAllSpecialties] = useState<Specialty[]>([])
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([])
  const [cities, setCities] = useState<City[]>([])

  // ---------------- queue ----------------
  const [currentToken, setCurrentToken] = useState(0)
  const [lastIssued, setLastIssued] = useState(0)
  const [tokens, setTokens] = useState<TokenRow[]>([])
  const [walkinName, setWalkinName] = useState('')

  // ---------------- reset queue modal ----------------
  const [resetOpen, setResetOpen] = useState(false)
  const [resetPassword, setResetPassword] = useState('')
  const [resetError, setResetError] = useState('')

  // ---------------- edit profile slide-over ----------------
  const [editOpen, setEditOpen] = useState(false)

  // ---------------- UI state ----------------
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  const todayStr = new Date().toISOString().split('T')[0]

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
        .select(
          'id, clinic_id, qualifications, experience_years, consultation_hours, token_enabled, verification_status, current_token_number, last_issued_token_number'
        )
        .eq('user_id', user.id)
        .single()

      if (!doctorRow) {
        setLoading(false)
        return
      }

      setDoctorId(doctorRow.id)
      setClinicId(doctorRow.clinic_id)
      setQualifications(doctorRow.qualifications ?? '')
      setExperienceYears(
        doctorRow.experience_years != null ? String(doctorRow.experience_years) : ''
      )
      setConsultationHours(doctorRow.consultation_hours ?? '')
      setTokenEnabled(!!doctorRow.token_enabled)
      setVerificationStatus(doctorRow.verification_status ?? 'pending')
      setCurrentToken(Number(doctorRow.current_token_number) || 0)
      setLastIssued(Number(doctorRow.last_issued_token_number) || 0)

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

      await loadTokens(doctorRow.id)
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

  async function loadTokens(docId: string) {
    const { data } = await supabase
      .from('tokens')
      .select('id, token_number, patient_name, Status')
      .eq('doctor_id', docId)
      .eq('Date', todayStr)
      .order('token_number')
    setTokens(data ?? [])
  }

  // ============================================================
  // SAVE PROFILE
  // ============================================================
  async function handleSaveProfile() {
    if (!userId) return
    setSaving(true)
    setSaveMessage('')

    try {
      const { error: userErr } = await supabase
        .from('users')
        .update({ name, phone })
        .eq('id', userId)
      if (userErr) throw userErr

      let resolvedClinicId = clinicId
      if (resolvedClinicId) {
        const { error: clinicErr } = await supabase
          .from('Clinics')
          .update({
            Name: clinicName,
            Adress: clinicAddress,
            City: clinicCity,
            Phone: clinicPhone,
          })
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
        const rows = selectedSpecialties.map((specialty_id) => ({
          doctor_id: doctorId,
          specialty_id,
        }))
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
    setSelectedSpecialties((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  // ============================================================
  // QUEUE ACTIONS
  // ============================================================
  async function handleCallNext() {
    if (!doctorId) return
    const next = currentToken + 1
    const { error } = await supabase
      .from('Doctors')
      .update({ current_token_number: next })
      .eq('id', doctorId)
    if (!error) setCurrentToken(next)
  }

  async function handleAddWalkin() {
    if (!doctorId || !walkinName.trim()) return
    const nextNumber = lastIssued + 1

    const { error: tokenErr } = await supabase.from('tokens').insert({
      doctor_id: doctorId,
      patient_id: null,
      patient_name: walkinName.trim(),
      token_number: nextNumber,
      Date: todayStr,
      Status: 'Waiting',
    })
    if (tokenErr) return

    const { error: docErr } = await supabase
      .from('Doctors')
      .update({ last_issued_token_number: nextNumber })
      .eq('id', doctorId)
    if (!docErr) {
      setLastIssued(nextNumber)
      setWalkinName('')
      loadTokens(doctorId)
    }
  }

  async function handleConfirmReset() {
    if (!doctorId || !userEmail) return
    setResetError('')

    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: resetPassword,
    })
    if (authErr) {
      setResetError('Incorrect password.')
      return
    }

    await supabase.from('tokens').delete().eq('doctor_id', doctorId).eq('Date', todayStr)
    await supabase
      .from('Doctors')
      .update({ current_token_number: 0, last_issued_token_number: 0 })
      .eq('id', doctorId)

    setCurrentToken(0)
    setLastIssued(0)
    setTokens([])
    setResetOpen(false)
    setResetPassword('')
  }

  // ============================================================
  // RENDER
  // ============================================================
  if (loading) {
    return (
      <div className="min-h-screen bg-[#EFEEE6] flex items-center justify-center">
        <p className="text-[#5C6B6F] text-sm">Loading dashboard...</p>
      </div>
    )
  }

  const waitingCount = Math.max(lastIssued - currentToken, 0)
  const selectedSpecialtyNames = allSpecialties
    .filter((s) => selectedSpecialties.includes(s.id))
    .map((s) => s.name)

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#EFEEE6]">
      {/* Background glows */}
      <div className="pointer-events-none absolute -top-40 -left-32 w-[600px] h-[600px] rounded-full bg-[#3FA9D6] opacity-20 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-40 w-[550px] h-[550px] rounded-full bg-[#4FBE8E] opacity-20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-100px] left-1/3 w-[500px] h-[500px] rounded-full bg-[#F2C14E] opacity-[0.15] blur-3xl" />

      <div className="relative max-w-4xl mx-auto px-6 py-8 flex flex-col gap-5">
        {/* ---------------- Header ---------------- */}
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3FA9D6] to-[#4FBE8E] flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M3 12h4l2 7 4-14 2 7h6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-2xl font-serif font-bold">
            <span className="text-[#3FA9D6]">Suggest</span>
            <span className="text-[#4FBE8E]">Doc</span>
            <span className="text-[#1E2A2E] font-sans font-semibold text-base ml-2">
              Doctor Dashboard
            </span>
          </h1>
        </div>

        {/* ---------------- Verification banner ---------------- */}
        <div
          className={`rounded-xl px-4 py-3 text-sm font-medium ${
            verificationStatus === 'verified'
              ? 'bg-[#E5F6EE] text-[#2E8B62]'
              : 'bg-[#FDF6E3] text-[#B99B4A]'
          }`}
        >
          {verificationStatus === 'verified'
            ? '✓ Verified — patients can find and book you.'
            : "⏳ Pending review: patients can't see you until you're verified."}
        </div>

        {/* ---------------- QUEUE PANEL ---------------- */}
        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(13,59,62,0.1)] p-5">
          <h2 className="text-lg font-semibold text-[#1E2A2E] mb-4">Today&apos;s Queue</h2>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-[#EAF6EE] rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-[#2E8B62]">{currentToken}</p>
              <p className="text-xs text-[#5C6B6F] mt-1">Now serving</p>
            </div>
            <div className="bg-[#EAF3F6] rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-[#2E8B9E]">{waitingCount}</p>
              <p className="text-xs text-[#5C6B6F] mt-1">Waiting</p>
            </div>
            <div className="bg-[#FDF6E3] rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-[#B99B4A]">{lastIssued}</p>
              <p className="text-xs text-[#5C6B6F] mt-1">Total issued</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <button
              onClick={handleCallNext}
              disabled={waitingCount === 0}
              className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-[#3FA9D6] to-[#4FBE8E] text-white text-sm font-medium hover:brightness-105 active:scale-[0.99] transition disabled:opacity-40"
            >
              Call Next
            </button>
            <button
              onClick={() => setResetOpen(true)}
              className="py-2.5 px-4 rounded-lg border border-[#D8D4C8] text-[#5C6B6F] text-sm font-medium hover:border-[#B3402A] hover:text-[#B3402A] transition"
            >
              Reset Queue
            </button>
          </div>

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={walkinName}
              onChange={(e) => setWalkinName(e.target.value)}
              placeholder="Walk-in patient name"
              className="flex-1 px-3 py-2.5 rounded-lg border border-[#D8D4C8] bg-white text-sm text-[#2A2A28] outline-none focus:border-[#0D3B3E]"
            />
            <button
              onClick={handleAddWalkin}
              disabled={!walkinName.trim()}
              className="px-4 py-2.5 rounded-lg bg-[#E8734A] text-white text-sm font-medium hover:brightness-105 transition disabled:opacity-40"
            >
              Add Walk-in
            </button>
          </div>

          <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto">
            {tokens.length === 0 && (
              <p className="text-sm text-[#7A8B90] text-center py-4">No tokens yet today.</p>
            )}
            {tokens.map((t) => (
              <div
                key={t.id}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                  t.token_number === currentToken
                    ? 'bg-[#EAF6EE] font-semibold text-[#2E8B62]'
                    : 'bg-[#FAFAF7] text-[#2A2A28]'
                }`}
              >
                <span>Token #{t.token_number}</span>
                <span>{t.patient_name ?? 'SuggestDoc patient'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ---------------- PROFILE SUMMARY (read-only view) ---------------- */}
        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(13,59,62,0.1)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#1E2A2E]">Your Profile</h2>
            <button
              onClick={() => setEditOpen(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-white bg-gradient-to-r from-[#3FA9D6] to-[#4FBE8E] rounded-full px-4 py-1.5 hover:brightness-105 active:scale-[0.98] transition"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
                <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Edit Profile
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-lg font-bold text-[#1E2A2E]">{name || 'Unnamed doctor'}</p>

            {selectedSpecialtyNames.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedSpecialtyNames.map((n) => (
                  <span
                    key={n}
                    className="bg-gradient-to-r from-[#3FA9D6] to-[#4FBE8E] text-white text-xs font-medium rounded-full px-2.5 py-1"
                  >
                    {n}
                  </span>
                ))}
              </div>
            )}

            {(qualifications || experienceYears) && (
              <div className="flex items-center gap-1.5">
                <BadgeIcon />
                <p className="text-sm text-[#7A8B90]">
                  {qualifications}
                  {experienceYears ? ` · ${experienceYears} yrs experience` : ''}
                </p>
              </div>
            )}

            {phone && (
              <div className="flex items-center gap-1.5">
                <PhoneIcon />
                <p className="text-sm text-[#5C6B6F]">{phone}</p>
              </div>
            )}

            {(clinicName || clinicAddress) && (
              <div className="flex items-start gap-1.5">
                <PinIcon />
                <p className="text-sm text-[#5C6B6F] leading-snug">
                  {clinicName}
                  {clinicAddress ? `, ${clinicAddress}` : ''}
                  {clinicCity ? `, ${clinicCity}` : ''}
                </p>
              </div>
            )}

            {consultationHours && (
              <div className="flex items-center gap-1.5">
                <ClockIcon />
                <p className="text-sm text-[#7A8B90]">{consultationHours}</p>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <span
                className={`w-2 h-2 rounded-full ${
                  tokenEnabled ? 'bg-[#4FBE8E]' : 'bg-[#D8D4C8]'
                }`}
              />
              <p className="text-sm text-[#7A8B90]">
                {tokenEnabled ? 'Online token queue enabled' : 'Online token queue disabled'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- EDIT PROFILE SLIDE-OVER ---------------- */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setEditOpen(false)}
          />

          {/* panel */}
          <div className="relative w-full max-w-md h-full bg-[#EFEEE6] shadow-2xl overflow-y-auto animate-[sd-slide-in_0.25s_ease-out]">
            <style>{`
              @keyframes sd-slide-in {
                from { transform: translateX(100%); }
                to { transform: translateX(0); }
              }
            `}</style>

            <div className="p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#1E2A2E]">Edit Profile</h2>
                <button
                  onClick={() => setEditOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#7A8B90] hover:bg-white transition"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-3">
                <div className="grid grid-cols-1 gap-3">
                  <input
                    type="text"
                    placeholder="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="px-4 py-2.5 rounded-lg border border-[#D8D4C8] bg-white text-sm text-[#2A2A28] outline-none focus:border-[#0D3B3E]"
                  />
                  <input
                    type="tel"
                    placeholder="Phone (shown to patients)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="px-4 py-2.5 rounded-lg border border-[#D8D4C8] bg-white text-sm text-[#2A2A28] outline-none focus:border-[#0D3B3E]"
                  />
                </div>

                <p className="text-sm font-medium text-[#1E2A2E] mt-1">Specialties</p>
                <div className="flex flex-wrap gap-2">
                  {allSpecialties.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleSpecialty(s.id)}
                      className={`text-sm px-3 py-1.5 rounded-full border transition ${
                        selectedSpecialties.includes(s.id)
                          ? 'bg-[#0D3B3E] border-[#0D3B3E] text-white'
                          : 'border-[#D8D4C8] text-[#5C6B6F]'
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
                  className="px-4 py-2.5 rounded-lg border border-[#D8D4C8] bg-white text-sm text-[#2A2A28] outline-none focus:border-[#0D3B3E]"
                />
                <input
                  type="number"
                  placeholder="Years of experience"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                  className="px-4 py-2.5 rounded-lg border border-[#D8D4C8] bg-white text-sm text-[#2A2A28] outline-none focus:border-[#0D3B3E]"
                />
                <input
                  type="text"
                  placeholder="Consultation hours (e.g. Mon–Sat, 10am–2pm)"
                  value={consultationHours}
                  onChange={(e) => setConsultationHours(e.target.value)}
                  className="px-4 py-2.5 rounded-lg border border-[#D8D4C8] bg-white text-sm text-[#2A2A28] outline-none focus:border-[#0D3B3E]"
                />

                <p className="text-sm font-medium text-[#1E2A2E] mt-1">Clinic</p>
                <input
                  type="text"
                  placeholder="Clinic name"
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  className="px-4 py-2.5 rounded-lg border border-[#D8D4C8] bg-white text-sm text-[#2A2A28] outline-none focus:border-[#0D3B3E]"
                />
                <input
                  type="tel"
                  placeholder="Clinic phone"
                  value={clinicPhone}
                  onChange={(e) => setClinicPhone(e.target.value)}
                  className="px-4 py-2.5 rounded-lg border border-[#D8D4C8] bg-white text-sm text-[#2A2A28] outline-none focus:border-[#0D3B3E]"
                />
                <input
                  type="text"
                  placeholder="Clinic address"
                  value={clinicAddress}
                  onChange={(e) => setClinicAddress(e.target.value)}
                  className="px-4 py-2.5 rounded-lg border border-[#D8D4C8] bg-white text-sm text-[#2A2A28] outline-none focus:border-[#0D3B3E]"
                />
                <select
                  value={clinicCity}
                  onChange={(e) => setClinicCity(e.target.value)}
                  className="px-4 py-2.5 rounded-lg border border-[#D8D4C8] bg-white text-sm text-[#2A2A28] outline-none focus:border-[#0D3B3E]"
                >
                  <option value="">Select district</option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.Name}>
                      {c.Name}
                    </option>
                  ))}
                </select>

                <label className="flex items-center gap-2 mt-1 cursor-pointer w-fit">
                  <input
                    type="checkbox"
                    checked={tokenEnabled}
                    onChange={(e) => setTokenEnabled(e.target.checked)}
                    className="w-4 h-4 accent-[#0D3B3E]"
                  />
                  <span className="text-sm text-[#2A2A28]">Enable online token queue</span>
                </label>

                {saveMessage && <p className="text-sm text-[#5C6B6F]">{saveMessage}</p>}

                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="w-full py-3 rounded-lg bg-gradient-to-r from-[#3FA9D6] to-[#4FBE8E] text-white font-medium text-sm hover:brightness-105 active:scale-[0.99] transition disabled:opacity-60 mt-1"
                >
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- RESET QUEUE MODAL ---------------- */}
      {resetOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-6 z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-[#1E2A2E] mb-2">Reset today&apos;s queue?</h3>
            <p className="text-sm text-[#7A8B90] mb-4">
              This clears all of today&apos;s tokens and resets the counters to zero. Enter your
              password to confirm.
            </p>
            <input
              type="password"
              placeholder="Account password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-[#D8D4C8] bg-white text-sm text-[#2A2A28] outline-none focus:border-[#0D3B3E] mb-2"
            />
            {resetError && <p className="text-sm text-[#B3402A] mb-2">{resetError}</p>}
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => {
                  setResetOpen(false)
                  setResetPassword('')
                  setResetError('')
                }}
                className="flex-1 py-2.5 rounded-lg border border-[#D8D4C8] text-[#5C6B6F] text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReset}
                disabled={!resetPassword}
                className="flex-1 py-2.5 rounded-lg bg-[#B3402A] text-white text-sm font-medium disabled:opacity-50"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}