'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import AuthCard from '@/components/AuthCard'

const input =
  'w-full rounded-2xl border border-[#D6E4E4] bg-white/90 py-3 pl-11 pr-12 text-sm text-[#2A2A28] outline-none transition placeholder:text-[#8FA3A3] focus:border-[#2E8B9E] focus:ring-4 focus:ring-[#2E8B9E]/15 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-[#6F8F8F] dark:focus:border-[#4FBE8E] dark:focus:ring-[#4FBE8E]/20'

type Status = 'checking' | 'ready' | 'invalid' | 'done'

function strength(pw: string) {
  let s = 0
  if (pw.length >= 6) s++
  if (pw.length >= 10) s++
  if (/[A-Za-z]/.test(pw) && /\d/.test(pw)) s++
  return s
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const [status, setStatus] = useState<Status>('checking')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // The email link signs the user in temporarily; wait for that
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setStatus((s) => (s === 'done' ? s : 'ready'))
      }
    })
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setStatus((s) => (s === 'checking' ? 'ready' : s))
    })
    const t = setTimeout(() => setStatus((s) => (s === 'checking' ? 'invalid' : s)), 4000)

    return () => {
      sub.subscription.unsubscribe()
      clearTimeout(t)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('The two passwords do not match.')
      return
    }

    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (err) {
      setError(err.message)
      return
    }

    setStatus('done')
    await supabase.auth.signOut()
    setTimeout(() => router.push('/?mode=signin'), 2500)
  }

  const s = strength(password)
  const bars = ['bg-[#E8734A]', 'bg-[#F2C14E]', 'bg-[#4FBE8E]']
  const labels = ['Weak', 'Okay', 'Strong']

  return (
    <AuthCard
      icon={
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          {status === 'done' ? (
            <path d="M5 12l5 5 9-10" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <>
              <rect x="5" y="11" width="14" height="9" rx="2.5" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round" />
            </>
          )}
        </svg>
      }
      title={
        status === 'done'
          ? 'Password updated'
          : status === 'invalid'
          ? 'Link expired'
          : 'Set a new password'
      }
      subtitle={status === 'ready' ? 'Choose a password you have not used before.' : undefined}
    >
      {status === 'checking' && (
        <div className="flex items-center justify-center gap-2 py-4 text-sm text-[#5C6B6F] dark:text-[#A9C6C4]">
          <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <circle cx="12" cy="12" r="9" strokeOpacity="0.3" />
            <path d="M21 12a9 9 0 0 0-9-9" strokeLinecap="round" />
          </svg>
          Checking your link...
        </div>
      )}

      {status === 'invalid' && (
        <div className="ac-swap flex flex-col gap-3 text-center">
          <p className="rounded-2xl bg-[#FDEAE6] px-4 py-3 text-sm text-[#B3402A] dark:bg-[#3A1A16] dark:text-[#FFB4A6]">
            This reset link is invalid or has expired. Request a new one.
          </p>
          <Link
            href="/forgot-password"
            className="rounded-2xl bg-gradient-to-r from-[#2E8B9E] to-[#4FBE8E] py-3 text-sm font-medium text-white shadow-md transition hover:brightness-110"
          >
            Send a new link
          </Link>
        </div>
      )}

      {status === 'done' && (
        <p className="ac-swap rounded-2xl bg-[#4FBE8E]/15 px-4 py-3 text-center text-sm text-[#1F7A55] dark:text-[#6FE3B2]">
          All set. Taking you to sign in...
        </p>
      )}

      {status === 'ready' && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#2E8B9E] dark:text-[#6FE3B2]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="5" y="11" width="14" height="9" rx="2.5" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round" />
              </svg>
            </span>
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className={input}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-[#5C6B6F] transition hover:text-[#2E8B9E] dark:text-[#A9C6C4] dark:hover:text-[#6FE3B2]"
            >
              {showPw ? 'Hide' : 'Show'}
            </button>
          </div>

          {/* Strength meter */}
          {password && (
            <div className="ac-swap -mt-1 flex items-center gap-2">
              <div className="flex flex-1 gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      i < s ? bars[Math.max(s - 1, 0)] : 'bg-[#D6E4E4] dark:bg-white/15'
                    }`}
                  />
                ))}
              </div>
              <span className="w-12 text-right text-xs text-[#5C6B6F] dark:text-[#A9C6C4]">
                {labels[Math.max(s - 1, 0)]}
              </span>
            </div>
          )}

          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#2E8B9E] dark:text-[#6FE3B2]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M5 12l5 5 9-10" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
              className={input}
            />
          </div>

          {error && (
            <p
              key={error}
              className="ac-shake rounded-xl bg-[#FDEAE6] px-3 py-2 text-sm text-[#B3402A] dark:bg-[#3A1A16] dark:text-[#FFB4A6]"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#2E8B9E] to-[#4FBE8E] py-3.5 text-sm font-medium text-white shadow-[0_8px_22px_rgba(46,139,158,0.35)] transition hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.99] disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {loading ? (
              <>
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <circle cx="12" cy="12" r="9" strokeOpacity="0.3" />
                  <path d="M21 12a9 9 0 0 0-9-9" strokeLinecap="round" />
                </svg>
                Saving...
              </>
            ) : (
              'Update password'
            )}
          </button>
        </form>
      )}
    </AuthCard>
  )
}