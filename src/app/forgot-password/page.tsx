'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import AuthCard from '@/components/AuthCard'

const input =
  'w-full rounded-2xl border border-[#D6E4E4] bg-white/90 py-3 pl-11 pr-4 text-sm text-[#2A2A28] outline-none transition placeholder:text-[#8FA3A3] focus:border-[#2E8B9E] focus:ring-4 focus:ring-[#2E8B9E]/15 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-[#6F8F8F] dark:focus:border-[#4FBE8E] dark:focus:ring-[#4FBE8E]/20'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }
    setSent(true)
  }

  return (
    <AuthCard
      icon={
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="5" y="11" width="14" height="9" rx="2.5" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round" />
        </svg>
      }
      title={sent ? 'Check your email' : 'Forgot your password?'}
      subtitle={
        sent
          ? undefined
          : "Enter your account email and we'll send you a link to set a new password."
      }
    >
      {sent ? (
        <div className="ac-swap flex flex-col gap-4 text-center">
          <p className="rounded-2xl bg-[#4FBE8E]/15 px-4 py-3 text-sm text-[#1F7A55] dark:text-[#6FE3B2]">
            If an account exists for <span className="font-semibold">{email.trim()}</span>, a reset
            link is on its way. It can take a minute, so check your spam folder too.
          </p>
          <button
            type="button"
            onClick={() => setSent(false)}
            className="text-sm font-medium text-[#2E8B9E] hover:underline dark:text-[#6FE3B2]"
          >
            Use a different email
          </button>
          <Link
            href="/?mode=signin"
            className="rounded-2xl bg-gradient-to-r from-[#2E8B9E] to-[#4FBE8E] py-3 text-sm font-medium text-white shadow-md transition hover:brightness-110 active:scale-[0.99]"
          >
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#2E8B9E] dark:text-[#6FE3B2]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="5" width="18" height="14" rx="3" />
                <path d="M3 8l9 6 9-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
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
            disabled={loading || !email.trim()}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#2E8B9E] to-[#4FBE8E] py-3.5 text-sm font-medium text-white shadow-[0_8px_22px_rgba(46,139,158,0.35)] transition hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.99] disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {loading ? (
              <>
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <circle cx="12" cy="12" r="9" strokeOpacity="0.3" />
                  <path d="M21 12a9 9 0 0 0-9-9" strokeLinecap="round" />
                </svg>
                Sending...
              </>
            ) : (
              'Send reset link'
            )}
          </button>

          <Link
            href="/?mode=signin"
            className="mt-1 text-center text-sm font-medium text-[#2E8B9E] hover:underline dark:text-[#6FE3B2]"
          >
            Back to sign in
          </Link>
        </form>
      )}
    </AuthCard>
  )
}