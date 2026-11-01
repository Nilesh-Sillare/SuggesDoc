'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import ThemeToggle from '@/components/ThemeToggle'

type Profile = { name: string; role: string }

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [ready, setReady] = useState(false)
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Watch the login state (no session = guest)
  useEffect(() => {
    let active = true

    async function load(userId?: string) {
      if (!userId) {
        if (active) {
          setProfile(null)
          setIsAdmin(false)
          setReady(true)
        }
        return
      }
      const [{ data }, { data: adm }] = await Promise.all([
        supabase.from('users').select('name, role').eq('id', userId).maybeSingle(),
        supabase.rpc('is_admin'),
      ])
      if (active) {
        setProfile({ name: data?.name || 'My account', role: data?.role || 'patient' })
        setIsAdmin(!!adm)
        setReady(true)
      }
    }

    supabase.auth.getSession().then(({ data }) => load(data.session?.user.id))

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => load(session?.user.id), 0)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  // Close the menu when clicking outside it
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    setOpen(false)
    router.push('/')
  }

  // The landing page has its own header
  if (pathname === '/') return null

  const linkClass =
    'flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-[#2A2A28] transition hover:bg-[#EAF6EE] dark:text-[#DCEEEC] dark:hover:bg-white/10'

  return (
    <header className="sticky top-0 z-50 border-b border-white/70 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-[#071A1D]/75">
      <style>{`
        @keyframes nb-pop { from { opacity: 0; transform: translateY(-6px) scale(0.97); } to { opacity: 1; transform: none; } }
      `}</style>

      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-2.5">
        {/* Logo */}
        <Link href={isAdmin ? '/admin' : '/home'} className="group flex items-center gap-3">
          <span className="relative flex h-12 w-12 items-center justify-center">
            <span className="nb-ring absolute inset-0 rounded-full bg-gradient-to-br from-[#2E8B9E] to-[#4FBE8E]" />
            <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#2E8B9E] to-[#4FBE8E] shadow-[0_6px_20px_rgba(46,139,158,0.45)] transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M3 12h4l2 7 4-14 2 7h6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </span>
          <span className="font-serif text-2xl font-bold leading-none sm:text-3xl">
            <span className="bg-gradient-to-r from-[#2E8B9E] to-[#3FA9D6] bg-clip-text text-transparent dark:from-[#5FD0E6] dark:to-[#8FD9FF]">
              Suggest
            </span>
            <span className="bg-gradient-to-r from-[#4FBE8E] to-[#2E8B9E] bg-clip-text text-transparent dark:from-[#6FE3B2] dark:to-[#4FBE8E]">
              Doc
            </span>
          </span>
        </Link>

        {/* Top right: theme toggle + sign in / profile */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          <div className="relative min-h-9" ref={menuRef}>
            {ready && !profile && (
              <Link
                href="/?mode=signin"
                className="flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-4 py-2 text-sm font-medium text-[#0D3B3E] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/10 dark:text-white"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round" />
                </svg>
                Sign In
              </Link>
            )}

            {ready && profile && (
              <>
                <button
                  onClick={() => setOpen((o) => !o)}
                  className="flex items-center gap-2 rounded-full border border-[#E3DFD3] bg-white/80 py-1 pl-1 pr-3 shadow-sm transition hover:shadow-md active:scale-[0.98] dark:border-white/10 dark:bg-white/10"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#2E8B9E] to-[#4FBE8E] text-sm font-semibold text-white">
                    {profile.name.trim().charAt(0).toUpperCase() || 'U'}
                  </span>
                  <span className="hidden max-w-[120px] truncate text-sm font-medium text-[#0D3B3E] sm:block dark:text-white">
                    {profile.name}
                  </span>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className={`text-[#7A8079] transition-transform dark:text-[#A9C6C4] ${open ? 'rotate-180' : ''}`}
                  >
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {open && (
                  <div
                    className="absolute right-0 mt-2 w-64 rounded-2xl border border-white/80 bg-white p-2 shadow-[0_16px_40px_rgba(13,59,62,0.18)] dark:border-white/10 dark:bg-[#0C2226]"
                    style={{ animation: 'nb-pop 0.18s ease-out' }}
                  >
                    <div className="px-3 py-2">
                      <p className="truncate text-sm font-semibold text-[#0D3B3E] dark:text-white">
                        {profile.name}
                      </p>
                      <span className="mt-1 inline-block rounded-full bg-[#EAF6EE] px-2 py-0.5 text-xs font-medium capitalize text-[#2E8B9E] dark:bg-[#4FBE8E]/15 dark:text-[#6FE3B2]">
                        {isAdmin ? 'admin' : profile.role}
                      </span>
                    </div>
                    <div className="my-1 h-px bg-[#EFECE4] dark:bg-white/10" />

                    {isAdmin ? (
                      <Link href="/admin" onClick={() => setOpen(false)} className={linkClass}>
                        Admin panel
                      </Link>
                    ) : (
                      <>
                        <Link href="/home" onClick={() => setOpen(false)} className={linkClass}>
                          Find doctors
                        </Link>
                        {profile.role === 'doctor' ? (
                          <Link href="/doctor/dashboard" onClick={() => setOpen(false)} className={linkClass}>
                            My dashboard
                          </Link>
                        ) : (
                          <Link href="/my-token" onClick={() => setOpen(false)} className={linkClass}>
                            My token
                          </Link>
                        )}
                      </>
                    )}

                    <div className="my-1 h-px bg-[#EFECE4] dark:bg-white/10" />
                    <button
                      onClick={signOut}
                      className="w-full rounded-xl px-3 py-2 text-left text-sm text-[#B3402A] transition hover:bg-[#FDEAE6] dark:text-[#FF9C88] dark:hover:bg-[#FF9C88]/10"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}