'use client'

// ============================================================
// IMPORTS
// ============================================================
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

// ============================================================
// TYPES
// ============================================================
type MyToken = {
  tokenId: string
  tokenNumber: number
  doctorId: string
  doctorName: string
  clinicName: string | null
  clinicAddress: string | null
  clinicPhone: string | null
  currentTokenNumber: number
}

export default function MyTokenPage() {
  const router = useRouter()
  const [tokens, setTokens] = useState<MyToken[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

  // ============================================================
  // LOAD TODAY'S TOKENS FOR THIS PATIENT
  // ============================================================
  async function loadTokens() {
    const { data: authData } = await supabase.auth.getUser()
    const user = authData.user
    if (!user) {
      router.push('/')
      return
    }

    const { data: patientRow } = await supabase
      .from('Patient')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!patientRow) {
      setError('No patient profile found.')
      setLoading(false)
      return
    }

    const { data: tokenRows, error: tokenErr } = await supabase
      .from('tokens')
      .select('id, token_number, doctor_id')
      .eq('patient_id', patientRow.id)
      .eq('Date', todayStr)
      .order('created_at', { ascending: false })

    if (tokenErr) {
      setError(tokenErr.message)
      setLoading(false)
      return
    }

    if (!tokenRows || tokenRows.length === 0) {
      setTokens([])
      setLoading(false)
      return
    }

    const doctorIds = [...new Set(tokenRows.map((t) => t.doctor_id))]

    const { data: doctorRows } = await supabase
      .from('Doctors')
      .select('id, user_id, clinic_id, current_token_number')
      .in('id', doctorIds)

    const userIds = (doctorRows ?? []).map((d) => d.user_id)
    const clinicIds = (doctorRows ?? []).map((d) => d.clinic_id).filter(Boolean)

    const { data: userRows } = await supabase
      .from('users')
      .select('id, name')
      .in('id', userIds)

    const { data: clinicRows } = await supabase
      .from('Clinics')
      .select('id, Name, Adress, Phone')
      .in('id', clinicIds)

    const merged: MyToken[] = tokenRows.map((t) => {
      const doc = doctorRows?.find((d) => d.id === t.doctor_id)
      const usr = userRows?.find((u) => u.id === doc?.user_id)
      const clinic = clinicRows?.find((c) => c.id === doc?.clinic_id)
      return {
        tokenId: t.id,
        tokenNumber: t.token_number,
        doctorId: t.doctor_id,
        doctorName: usr?.name ?? 'Unknown doctor',
        clinicName: clinic?.Name ?? null,
        clinicAddress: clinic?.Adress ?? null,
        clinicPhone: clinic?.Phone ?? null,
        currentTokenNumber: Number(doc?.current_token_number) || 0,
      }
    })

    setTokens(merged)
    setLoading(false)
  }

  useEffect(() => {
    loadTokens()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ============================================================
  // LIVE UPDATES — listen for the doctor's current_token_number changing
  // ============================================================
  useEffect(() => {
    if (tokens.length === 0) return

    const doctorIds = [...new Set(tokens.map((t) => t.doctorId))]

    const channel = supabase
      .channel('my-token-live')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'Doctors' },
        (payload) => {
          const updated = payload.new as { id: string; current_token_number: number }
          if (!doctorIds.includes(updated.id)) return

          setTokens((prev) =>
            prev.map((t) =>
              t.doctorId === updated.id
                ? { ...t, currentTokenNumber: Number(updated.current_token_number) || 0 }
                : t
            )
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens.length])

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#EFEEE6]">
      <div className="pointer-events-none absolute -top-40 -left-32 w-[600px] h-[600px] rounded-full bg-[#3FA9D6] opacity-20 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-40 w-[550px] h-[550px] rounded-full bg-[#4FBE8E] opacity-20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-100px] left-1/3 w-[500px] h-[500px] rounded-full bg-[#F2C14E] opacity-[0.15] blur-3xl" />

      <div className="relative max-w-2xl mx-auto px-6 py-8 flex flex-col gap-4">
        <Link
          href="/home"
          className="inline-flex items-center gap-1 text-sm font-medium text-[#2E8B9E] hover:text-[#0D3B3E] transition w-fit"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to home
        </Link>

        <h1 className="text-2xl font-serif font-bold text-[#0D3B3E]">My Tokens</h1>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-[#5C6B6F]">
            <span className="w-4 h-4 rounded-full border-2 border-[#3FA9D6] border-t-transparent animate-spin" />
            Loading your tokens...
          </div>
        ) : null}

        {!loading && error ? (
          <p className="text-sm text-[#B3402A] bg-[#FDEAE6] rounded-xl px-4 py-3">{error}</p>
        ) : null}

        {!loading && !error && tokens.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            <p className="text-sm text-[#7A8B90]">
              You don&apos;t have any active tokens today.
            </p>
            <Link
              href="/home"
              className="inline-block mt-3 text-sm font-medium text-white bg-gradient-to-r from-[#3FA9D6] to-[#4FBE8E] rounded-full px-5 py-2 hover:brightness-105 transition"
            >
              Find a doctor
            </Link>
          </div>
        ) : null}

        <div className="flex flex-col gap-4">
          {tokens.map((t) => {
            const position = Math.max(t.tokenNumber - t.currentTokenNumber, 0)
            const isUp = t.tokenNumber <= t.currentTokenNumber

            return (
              <div
                key={t.tokenId}
                className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(13,59,62,0.1)] p-5 flex flex-col gap-4"
              >
                <div>
                  <p className="text-lg font-bold text-[#1E2A2E]">{t.doctorName}</p>
                  {t.clinicName || t.clinicAddress ? (
                    <p className="text-sm text-[#7A8B90] mt-0.5">
                      {t.clinicName}
                      {t.clinicAddress ? `, ${t.clinicAddress}` : ''}
                    </p>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#EAF3F6] rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-[#2E8B9E]">{t.tokenNumber}</p>
                    <p className="text-xs text-[#5C6B6F] mt-1">Your token</p>
                  </div>
                  <div className="bg-[#EAF6EE] rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-[#2E8B62]">{t.currentTokenNumber}</p>
                    <p className="text-xs text-[#5C6B6F] mt-1">Now serving</p>
                  </div>
                </div>

                <p
                  className={`text-sm font-medium rounded-lg px-3 py-2 text-center ${
                    isUp
                      ? 'bg-[#EAF6EE] text-[#2E8B62]'
                      : 'bg-[#FDEDE6] text-[#E8734A]'
                  }`}
                >
                  {isUp
                    ? "It's your turn — please head to the clinic."
                    : `${position} ${position === 1 ? 'person' : 'people'} ahead of you`}
                </p>

                {t.clinicPhone ? (
                  <a
                    href={`tel:${t.clinicPhone}`}
                    className="flex items-center justify-center gap-1.5 border border-[#4FBE8E] text-[#4FBE8E] text-sm font-medium rounded-xl py-2.5 hover:bg-[#4FBE8E] hover:text-white transition"
                  >
                    Call clinic
                  </a>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}