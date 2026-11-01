'use client'

// Moon in light mode, sun in dark mode. Both icons are always rendered
// and CSS shows the right one, so there is no flicker or extra state.
export default function ThemeToggle() {
  function toggle() {
    const isDark = document.documentElement.classList.toggle('dark')
    try {
      localStorage.setItem('theme', isDark ? 'dark' : 'light')
    } catch {}
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="group flex h-10 w-10 items-center justify-center rounded-full border border-white/80 bg-white/80 text-[#0D3B3E] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:scale-90 dark:border-white/10 dark:bg-white/10 dark:text-[#FFD66B]"
    >
      <svg
        className="transition-transform duration-500 group-hover:-rotate-12 dark:hidden"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" strokeLinejoin="round" />
      </svg>
      <svg
        className="hidden transition-transform duration-500 group-hover:rotate-90 dark:block"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <circle cx="12" cy="12" r="4" />
        <path
          d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
          strokeLinecap="round"
        />
      </svg>
    </button>
  )
}