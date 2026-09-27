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
  return role === 'doctor' ? '/doctor/profile' : '/home'
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
  // FORM SUBMIT HANDLER
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

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#EFEEE6] flex flex-col items-center justify-between px-6 py-10">
      {/* ---------------- BACKGROUND — floating gradient blobs ---------------- */}
      <div className="pointer-events-none absolute -top-40 -left-32 w-[500px] h-[500px] rounded-full bg-[#0D3B3E] opacity-30 blur-3xl animate-[drift1_18s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute top-1/4 -right-40 w-[480px] h-[480px] rounded-full bg-[#E8734A] opacity-25 blur-3xl animate-[drift2_22s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute bottom-[-80px] left-1/4 w-[420px] h-[420px] rounded-full bg-[#5FA89B] opacity-30 blur-3xl animate-[drift1_20s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 w-72 h-72 rounded-full bg-[#F2C14E] opacity-[0.18] blur-3xl animate-[drift2_16s_ease-in-out_infinite]" />

      {/* ---------------- MAIN CARD — title + form ---------------- */}
      <div className="relative w-full max-w-110 flex-1 flex flex-col justify-center animate-[fadeInUp_0.6s_ease-out]">
        {/* --- Title / branding --- */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0D3B3E" strokeWidth="1.8">
            <path d="M3 12h4l2 7 4-14 2 7h6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h1 className="font-serif text-4xl text-[#0D3B3E] text-center">SuggestDoc</h1>
        </div>
        <p className="text-[#7A8079] text-center text-sm mb-8">
          Find the right doctor, without the guesswork.
        </p>

        {/* --- Glass form card --- */}
        <div className="rounded-2xl bg-white/70 backdrop-blur-md shadow-[0_8px_30px_rgba(13,59,62,0.12)] border border-white/60 p-6">
          {/* --- Sign Up / Sign In sliding toggle --- */}
          <div className="relative flex bg-[#EFECE4] rounded-full p-1 mb-6">
            <div
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full bg-[#0D3B3E] transition-transform duration-300 ease-out ${
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

          {/* --- Form --- */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {/* Fields only shown during SIGN UP */}
            {mode === 'signup' && (
              <>
                {/* Role dropdown */}
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className="w-full px-4 py-3 rounded-lg border border-[#D8D4C8] bg-white text-[#2A2A28] text-sm outline-none focus:border-[#0D3B3E] transition-colors"
                >
                  <option value="patient">Patient</option>
                  <option value="doctor">Doctor</option>
                </select>

                {/* Name + phone (shared by both roles) */}
                <input
                  type="text"
                  placeholder="Full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-[#D8D4C8] bg-white text-[#2A2A28] text-sm outline-none focus:border-[#0D3B3E] transition-colors"
                />
                <input
                  type="tel"
                  placeholder="Phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-[#D8D4C8] bg-white text-[#2A2A28] text-sm outline-none focus:border-[#0D3B3E] transition-colors"
                />

                {/* Doctor-only extra fields */}
                {role === 'doctor' && (
                  <div className="animate-[fadeInUp_0.3s_ease-out] flex flex-col gap-3">
                    <input
                      type="text"
                      placeholder="Qualifications (e.g. MBBS, MD)"
                      value={qualifications}
                      onChange={(e) => setQualifications(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-lg border border-[#D8D4C8] bg-white text-[#2A2A28] text-sm outline-none focus:border-[#0D3B3E] transition-colors"
                    />
                    <label className="w-full px-4 py-3 rounded-lg border border-dashed border-[#B7C4BC] bg-[#F4F7F5] text-sm text-[#2A2A28] cursor-pointer flex items-center justify-between hover:border-[#0D3B3E] transition-colors">
                      <span className="truncate">
                        {certFile ? certFile.name : 'Upload certification / license (PDF)'}
                      </span>
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={(e) =>
                          setCertFile(e.target.files ? e.target.files[0] : null)
                        }
                        className="hidden"
                      />
                    </label>
                    <p className="text-xs text-[#9CA39C]">
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
              className="w-full px-4 py-3 rounded-lg border border-[#D8D4C8] bg-white text-[#2A2A28] text-sm outline-none focus:border-[#0D3B3E] transition-colors"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-lg border border-[#D8D4C8] bg-white text-[#2A2A28] text-sm outline-none focus:border-[#0D3B3E] transition-colors"
            />

            {/* Error message */}
            {error && <p className="text-sm text-[#B3402A]">{error}</p>}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-[#E8734A] text-white font-medium text-sm mt-2 shadow-[0_4px_14px_rgba(232,115,74,0.35)] hover:brightness-105 active:scale-[0.99] transition disabled:opacity-60"
            >
              {loading ? 'Please wait...' : mode === 'signup' ? 'Create account' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>

      {/* ---------------- FOOTER — disclaimer + creator credit ---------------- */}
      <div className="relative w-full max-w-110 pt-8 mt-8 border-t border-[#D8D4C8] text-center">
        <p className="text-xs text-[#7A8079] mb-4">
          This is not a diagnosis. SuggestDoc only helps you identify the
          right type of doctor to consult.
        </p>
        <div className="flex flex-col items-center gap-1">
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
  )
}