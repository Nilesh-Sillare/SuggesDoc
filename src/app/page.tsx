'use client'

// ============================================================
// IMPORTS
// ============================================================
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabaseClient'

// ============================================================
// TYPES
// ============================================================
type Mode = 'signup' | 'signin'
type Role = 'patient' | 'doctor'

// Where each role lands after login
function homeFor(role: string | null | undefined) {
  return role === 'doctor' ? '/doctor/dashboard' : '/home'
}

// Shared look for all text inputs
const inputClass =
  'w-full px-4 py-3 rounded-xl border border-[#D8D4C8] bg-white/90 text-[#2A2A28] text-sm outline-none transition focus:border-[#3FA9D6] focus:ring-4 focus:ring-[#3FA9D6]/15'

// ============================================================
// WORDMARK — gradient logo, same style as the home page
// ============================================================
function Wordmark({ large = false }: { large?: boolean }) {
  return (
    <div className="flex items-center justify-center gap-2.5">
      <div
        className={`${
          large ? 'w-12 h-12' : 'w-10 h-10'
        } rounded-full bg-gradient-to-br from-[#3FA9D6] to-[#4FBE8E] flex items-center justify-center shadow-md`}
      >
        <svg width={large ? 22 : 18} height={large ? 22 : 18} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <path d="M3 12h4l2 7 4-14 2 7h6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h1 className={`font-serif font-bold ${large ? 'text-5xl' : 'text-3xl'}`}>
        <span className="text-[#3FA9D6]">Suggest</span>
        <span className="text-[#4FBE8E]">Doc</span>
      </h1>
    </div>
  )
}

export default function LandingPage() {
  const router = useRouter()

  // ============================================================
  // STATE — form mode and role toggle
  // ============================================================
  const [mode, setMode] = useState<Mode>('signup')
  const [role, setRole] = useState<Role>('patient')

  // ============================================================
  // STATE — shared form fields (used by both patient & doctor)
  // ============================================================
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // ============================================================
  // STATE — doctor-only fields
  // ============================================================
  const [qualifications, setQualifications] = useState('')
  const [certFile, setCertFile] = useState<File | null>(null)

  // ============================================================
  // STATE — UI feedback
  // ============================================================
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // ============================================================
  // HELPER — used when the auth account exists but a later step failed
  // ============================================================
  async function failSetup(message: string) {
    await supabase.auth.signOut()
    setError(
      'Your login was created but profile setup did not finish (' +
        message +
        '). Please try again with a different email.'
    )
  }

  // ============================================================
  // FORM SUBMIT HANDLER (logic unchanged)
  // Handles both Sign Up and Sign In depending on `mode`
  // ============================================================
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // Doctor sign-up requires a PDF certification file before proceeding
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

      // ----------------------------------------------------------
      // SIGN UP FLOW
      // ----------------------------------------------------------
      if (mode === 'signup') {
        // Step 1: create the auth account (email + password)
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

        // No session means "Confirm email" is ON in Supabase. Without a session
        // the next inserts would be rejected, so stop here with a clear message.
        if (!data.session) {
          setError(
            'Email confirmation is switched on, so your profile cannot be saved yet. Confirm your email or turn off "Confirm email" in Supabase Auth settings.'
          )
          return
        }

        // Step 2: create the shared profile row in "users"
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

        // Step 3a: if PATIENT — create their row in "Patient"
        if (role === 'patient') {
          const { error: patientError } = await supabase
            .from('Patient')
            .insert({ user_id: data.user.id })

          if (patientError) {
            await failSetup(patientError.message)
            return
          }
        }

        // Step 3b: if DOCTOR — upload certification, then create "Doctors" row
        if (role === 'doctor' && certFile) {
          // Upload into a folder named after the user's own ID.
          // Fixed file name avoids problems with spaces/special characters.
          const filePath = `${data.user.id}/certificate.pdf`
          const { error: uploadError } = await supabase.storage
            .from('doctor-certifications')
            .upload(filePath, certFile, { contentType: 'application/pdf' })

          if (uploadError) {
            await failSetup(uploadError.message)
            return
          }

          // Create the doctor row. verification_status is NOT sent:
          // the database default is 'pending', and the insert rule requires it.
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

        // Step 4: success — doctors go to their profile, patients to home
        router.push(homeFor(role))
      } else {
        // ----------------------------------------------------------
        // SIGN IN FLOW
        // ----------------------------------------------------------
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        })

        if (signInError) {
          setError(signInError.message)
          return
        }

        // Look up the role so doctors and patients land on the right page
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', data.user.id)
          .maybeSingle()

        router.push(homeFor(profile?.role))
      }
    } catch (err) {
      // Catches any unexpected error so the button never freezes silently
      setError(err instanceof Error ? err.message : 'Unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  // Style for the Patient / Doctor cards
  function roleCardClass(active: boolean) {
    return `flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3 text-sm font-medium transition-all duration-200 active:scale-[0.98] ${
      active
        ? 'border-[#3FA9D6] bg-gradient-to-br from-[#3FA9D6]/10 to-[#4FBE8E]/10 text-[#0D3B3E] shadow-sm'
        : 'border-[#E3DFD3] bg-white/70 text-[#7A8079] hover:border-[#3FA9D6]/50 hover:-translate-y-0.5'
    }`
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#EFEEE6]">
      {/* Animations live here so this page does not depend on globals.css */}
      <style>{`
        @keyframes sd-drift1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(45px,30px) scale(1.08); } }
        @keyframes sd-drift2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-45px,-28px) scale(1.1); } }
        @keyframes sd-fade-up { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) { .sd-anim { animation: none !important; } }
      `}</style>

      {/* ---------------- BACKGROUND — same four glows as the home page ---------------- */}
      <div className="sd-anim pointer-events-none absolute -top-40 -left-32 w-[600px] h-[600px] rounded-full bg-[#3FA9D6] opacity-20 blur-3xl animate-[sd-drift1_18s_ease-in-out_infinite]" />
      <div className="sd-anim pointer-events-none absolute top-1/3 -right-40 w-[550px] h-[550px] rounded-full bg-[#4FBE8E] opacity-20 blur-3xl animate-[sd-drift2_22s_ease-in-out_infinite]" />
      <div className="sd-anim pointer-events-none absolute bottom-[-100px] left-1/3 w-[500px] h-[500px] rounded-full bg-[#F2C14E] opacity-[0.15] blur-3xl animate-[sd-drift1_20s_ease-in-out_infinite]" />
      <div className="sd-anim pointer-events-none absolute top-10 right-1/4 w-[350px] h-[350px] rounded-full bg-[#E8734A] opacity-[0.12] blur-3xl animate-[sd-drift2_16s_ease-in-out_infinite]" />

      <div className="relative max-w-6xl mx-auto px-6 py-10 min-h-screen flex flex-col">
        {/* ---------------- MAIN — brand panel (desktop) + form ---------------- */}
        <div className="flex-1 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* ===== LEFT: brand panel, desktop only ===== */}
          <div className="hidden lg:flex flex-col gap-8 animate-[sd-fade-up_0.6s_ease-out]">
            <div className="flex flex-col items-start gap-4">
              <Wordmark large />
              <p className="text-xl text-[#5C6B6F] max-w-md leading-snug">
                Find the right doctor, without the guesswork.
              </p>
            </div>

            <div className="flex flex-col gap-3 max-w-md">
              <div className="flex items-center gap-3 bg-white/70 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-[0_4px_16px_rgba(13,59,62,0.06)]">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#3FA9D6] to-[#4FBE8E] flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
                  </svg>
                </div>
                <p className="text-sm text-[#2A2A28]">Pick a symptom and see which doctors can help</p>
              </div>
              <div className="flex items-center gap-3 bg-white/70 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-[0_4px_16px_rgba(13,59,62,0.06)]">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#3FA9D6] to-[#4FBE8E] flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11z" />
                    <circle cx="12" cy="10" r="2.5" />
                  </svg>
                </div>
                <p className="text-sm text-[#2A2A28]">Choose your district, then call or get directions in one tap</p>
              </div>
              <div className="flex items-center gap-3 bg-white/70 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-[0_4px_16px_rgba(13,59,62,0.06)]">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#3FA9D6] to-[#4FBE8E] flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 3" strokeLinecap="round" />
                  </svg>
                </div>
                <p className="text-sm text-[#2A2A28]">Join a live queue at clinics that offer digital tokens</p>
              </div>
            </div>
          </div>

          {/* ===== RIGHT: form ===== */}
          <div className="w-full max-w-md mx-auto lg:mx-0 lg:justify-self-center animate-[sd-fade-up_0.6s_ease-out]">
            {/* Mobile / tablet header (the brand panel is hidden here) */}
            <div className="lg:hidden mb-6 flex flex-col items-center gap-2">
              <Wordmark />
              <p className="text-[#7A8079] text-center text-sm">
                Find the right doctor, without the guesswork.
              </p>
            </div>

            {/* --- Form card --- */}
            <div className="rounded-2xl bg-white/80 backdrop-blur-md shadow-[0_8px_30px_rgba(13,59,62,0.12)] border border-white/70 p-6">
              {/* --- Sign Up / Sign In sliding toggle --- */}
              <div className="relative flex bg-[#EFECE4] rounded-full p-1 mb-5">
                <div
                  className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full bg-gradient-to-r from-[#3FA9D6] to-[#4FBE8E] shadow-sm transition-transform duration-300 ease-out ${
                    mode === 'signup' ? 'translate-x-0' : 'translate-x-[calc(100%+8px)]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className={`relative z-10 flex-1 py-2 rounded-full text-sm font-medium transition-colors ${
                    mode === 'signup' ? 'text-white' : 'text-[#0D3B3E]'
                  }`}
                >
                  Sign Up
                </button>
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className={`relative z-10 flex-1 py-2 rounded-full text-sm font-medium transition-colors ${
                    mode === 'signin' ? 'text-white' : 'text-[#0D3B3E]'
                  }`}
                >
                  Sign In
                </button>
              </div>

              <div className="mb-4">
                <h2 className="font-serif text-2xl font-bold text-[#0D3B3E]">
                  {mode === 'signup' ? 'Create your account' : 'Welcome back'}
                </h2>
                <p className="text-sm text-[#7A8079] mt-0.5">
                  {mode === 'signup'
                    ? 'It only takes a minute.'
                    : 'Sign in to continue.'}
                </p>
              </div>

              {/* --- Form --- */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                {/* Fields only shown during SIGN UP */}
                {mode === 'signup' && (
                  <>
                    {/* Role cards */}
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setRole('patient')}
                        className={roleCardClass(role === 'patient')}
                      >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <circle cx="12" cy="8" r="4" />
                          <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round" />
                        </svg>
                        Patient
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole('doctor')}
                        className={roleCardClass(role === 'doctor')}
                      >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <rect x="3" y="5" width="18" height="15" rx="3" />
                          <path d="M12 9v7M8.5 12.5h7" strokeLinecap="round" />
                        </svg>
                        Doctor
                      </button>
                    </div>

                    {/* Name + phone (shared by both roles) */}
                    <input
                      type="text"
                      placeholder="Full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className={inputClass}
                    />
                    <input
                      type="tel"
                      placeholder="Phone number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      className={inputClass}
                    />

                    {/* Doctor-only extra fields */}
                    {role === 'doctor' && (
                      <div className="animate-[sd-fade-up_0.3s_ease-out] flex flex-col gap-3">
                        <input
                          type="text"
                          placeholder="Qualifications (e.g. MBBS, MD)"
                          value={qualifications}
                          onChange={(e) => setQualifications(e.target.value)}
                          required
                          className={inputClass}
                        />
                        <label className="w-full px-4 py-3 rounded-xl border-2 border-dashed border-[#3FA9D6]/40 bg-[#3FA9D6]/5 text-sm text-[#2A2A28] cursor-pointer flex items-center justify-between gap-2 hover:border-[#3FA9D6] hover:bg-[#3FA9D6]/10 transition">
                          <span className="truncate">
                            {certFile ? certFile.name : 'Upload certification / license (PDF)'}
                          </span>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3FA9D6" strokeWidth="2" className="flex-shrink-0">
                            <path d="M12 16V4M7 9l5-5 5 5M4 20h16" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <input
                            type="file"
                            accept="application/pdf"
                            onChange={(e) =>
                              setCertFile(e.target.files ? e.target.files[0] : null)
                            }
                            className="hidden"
                          />
                        </label>
                        <p className="text-xs text-[#7A8079] bg-[#FFF6DD] rounded-lg px-3 py-2">
                          Your account will be reviewed and verified by an admin
                          before it becomes active.
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* Email + password — shown in BOTH sign up and sign in */}
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={inputClass}
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className={inputClass}
                />

                {/* Error message */}
                {error && (
                  <p className="text-sm text-[#B3402A] bg-[#FDEAE6] rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#3FA9D6] to-[#4FBE8E] text-white font-medium text-sm mt-1 shadow-[0_6px_18px_rgba(63,169,214,0.35)] hover:brightness-105 hover:-translate-y-0.5 active:scale-[0.99] transition disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {loading ? 'Please wait...' : mode === 'signup' ? 'Create account' : 'Sign in'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* ---------------- FOOTER — same style as the home page ---------------- */}
        <div className="w-full max-w-xl mx-auto pt-10 mt-10 text-center">
          <p className="text-xs text-[#B3402A] bg-[#FDEAE6] rounded-xl px-4 py-3 mb-4">
            <span className="font-semibold">Important Disclaimer:</span> SuggestDoc is for
            guidance only, not medical advice. Please consult a licensed doctor for proper
            diagnosis and treatment.
          </p>
          <p className="text-xs text-[#7A8079] mb-4">
            Made with <span className="text-[#E8734A]">&hearts;</span> for the people of Maharashtra
          </p>
          <div className="flex flex-col items-center gap-1">
            <p className="text-xs text-[#9CA39C]">Created by</p>
            <Image
              src="/dp2.png"
              alt="Nilesh Sillare"
              width={80}
              height={80}
              className="w-20 h-20 rounded-full object-cover shadow-md"
            />
            <p className="text-sm font-medium text-[#2A2A28]">Nilesh Sillare</p>
            <p className="text-xs text-[#9CA39C]">Creator &amp; Developer</p>
          </div>
        </div>
      </div>
    </div>
  )
}  