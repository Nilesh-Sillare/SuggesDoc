'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

type City = { id: string; Name: string }

type Props = {
  cities: City[]
  value: string
  onChange: (name: string) => void
  pinned?: string[]
  pinnedLabel?: string
  placeholder?: string
}

// Districts shown first, under their own heading
const DEFAULT_PINNED = ['Gondia', 'Nagpur']

export default function DistrictSelect({
  cities,
  value,
  onChange,
  pinned = DEFAULT_PINNED,
  pinnedLabel = 'Available now',
  placeholder = 'Select your district in Maharashtra',
}: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [active, setActive] = useState(0)

  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  // Pinned districts first, then the rest grouped by first letter (all filtered by search)
  const { pinnedList, groups, flat } = useMemo(() => {
    const q = search.trim().toLowerCase()
    const matches = (c: City) => c.Name.toLowerCase().includes(q)

    const pinnedList = pinned
      .map((n) => cities.find((c) => c.Name === n))
      .filter((c): c is City => !!c && matches(c))

    const rest = cities
      .filter((c) => !pinned.includes(c.Name) && matches(c))
      .sort((a, b) => a.Name.localeCompare(b.Name))

    const map = new Map<string, City[]>()
    rest.forEach((c) => {
      const letter = c.Name.charAt(0).toUpperCase()
      map.set(letter, [...(map.get(letter) ?? []), c])
    })

    // "start" = index of the group's first row in the keyboard order
    let start = pinnedList.length
    const groups = Array.from(map.entries()).map(([letter, items]) => {
      const g = { letter, items, start }
      start += items.length
      return g
    })

    return { pinnedList, groups, flat: [...pinnedList, ...rest] }
  }, [cities, pinned, search])

  // Close when clicking or tapping outside
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  // Focus the search box when the panel opens
  useEffect(() => {
    if (open) searchRef.current?.focus()
  }, [open])

  // Keep the highlighted row visible while using the arrow keys
  useEffect(() => {
    if (!open) return
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  function openPanel() {
    setSearch('')
    setActive(0)
    setOpen(true)
  }

  function choose(name: string) {
    onChange(name)
    setOpen(false)
    setSearch('')
    triggerRef.current?.focus()
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, Math.max(flat.length - 1, 0)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (flat[active]) choose(flat[active].Name)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      triggerRef.current?.focus()
    } else if (e.key === 'Tab') {
      setOpen(false)
    }
  }

  function handleTriggerKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === 'ArrowDown' && !open) {
      e.preventDefault()
      openPanel()
    }
  }

  const check = (
    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2E8B9E] to-[#4FBE8E] text-white">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        <path d="M5 12l5 5 9-10" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )

  // Card for the "available now" districts
  function renderPinned(c: City, index: number) {
    const selected = c.Name === value
    return (
      <li
        key={c.id}
        role="option"
        aria-selected={selected}
        data-index={index}
        onMouseEnter={() => setActive(index)}
        onClick={() => choose(c.Name)}
        className={`flex cursor-pointer items-center justify-between gap-2 rounded-xl border px-3 py-2.5 transition-all duration-200 ${
          index === active
            ? '-translate-y-0.5 border-[#4FBE8E] bg-[#EAF6EE] shadow-md dark:bg-white/10'
            : 'border-[#E3EEEC] bg-white/70 dark:border-white/10 dark:bg-white/5'
        }`}
      >
        <span className="min-w-0">
          <span
            className={`block truncate text-base ${
              selected
                ? 'font-semibold text-[#0D3B3E] dark:text-white'
                : 'font-medium text-[#2A2A28] dark:text-[#DCEEEC]'
            }`}
          >
            {c.Name}
          </span>
          <span className="text-xs text-[#5C6B6F] dark:text-[#A9C6C4]">Doctors available</span>
        </span>
        {selected ? (
          check
        ) : (
          <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
            <span className="ds-ping absolute inline-flex h-full w-full rounded-full bg-[#4FBE8E]" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#4FBE8E]" />
          </span>
        )}
      </li>
    )
  }

  // Normal row for the "all districts" list
  function renderRow(c: City, index: number) {
    const selected = c.Name === value
    return (
      <li
        key={c.id}
        role="option"
        aria-selected={selected}
        data-index={index}
        onMouseEnter={() => setActive(index)}
        onClick={() => choose(c.Name)}
        className={`flex scroll-mt-8 cursor-pointer items-center justify-between px-4 py-2.5 text-base transition-colors ${
          index === active ? 'bg-[#EAF6EE] shadow-[inset_3px_0_0_#4FBE8E] dark:bg-white/10' : ''
        }`}
      >
        <span
          className={
            selected ? 'font-semibold text-[#0D3B3E] dark:text-white' : 'text-[#2A2A28] dark:text-[#DCEEEC]'
          }
        >
          {c.Name}
        </span>
        {selected && check}
      </li>
    )
  }

  const loadingList = cities.length === 0
  const label = loadingList ? 'Loading districts...' : placeholder

  return (
    <div ref={rootRef} className="relative">
      <style>{`
        @keyframes ds-pop { from { opacity: 0; transform: translateY(-8px) scale(0.98); } to { opacity: 1; transform: none; } }
        @keyframes ds-ping { 0% { transform: scale(1); opacity: 0.7; } 100% { transform: scale(2.6); opacity: 0; } }
        .ds-pop { animation: ds-pop 0.2s ease-out; transform-origin: top; }
        .ds-ping { animation: ds-ping 1.8s cubic-bezier(0,0,0.2,1) infinite; }

        /* Scrollbar: applies ONLY to the district list (class ds-scroll) */
        .ds-scroll::-webkit-scrollbar { width: 10px; }
        .ds-scroll::-webkit-scrollbar-track {
          margin: 6px 0;
          border-radius: 999px;
          background: rgba(46, 139, 158, 0.08);
        }
        .ds-scroll::-webkit-scrollbar-thumb {
          border-radius: 999px;
          border: 2px solid transparent;
          background-clip: padding-box;
          background-image: linear-gradient(180deg, #2E8B9E, #4FBE8E);
        }
        .ds-scroll::-webkit-scrollbar-thumb:hover {
          background-image: linear-gradient(180deg, #3FA9D6, #4FBE8E);
        }
        .dark .ds-scroll::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.06); }
        /* Firefox */
        @supports (-moz-appearance: none) {
          .ds-scroll { scrollbar-width: thin; scrollbar-color: #4FBE8E rgba(46, 139, 158, 0.12); }
        }

        @media (prefers-reduced-motion: reduce) { .ds-pop, .ds-ping { animation: none !important; } }
      `}</style>

      {/* Closed state */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openPanel())}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="group flex w-full items-center gap-3 rounded-2xl border border-[#D6E4E4] bg-white/90 px-3 py-2.5 text-left outline-none transition hover:border-[#2E8B9E]/50 focus:border-[#2E8B9E] focus:ring-4 focus:ring-[#2E8B9E]/15 dark:border-white/10 dark:bg-white/5 dark:hover:border-[#4FBE8E]/50 dark:focus:border-[#4FBE8E] dark:focus:ring-[#4FBE8E]/20"
      >
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2E8B9E] to-[#4FBE8E] text-white shadow-sm transition-transform duration-300 group-hover:scale-110">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-xs text-[#5C6B6F] dark:text-[#A9C6C4]">District</span>
          <span
            className={`block truncate text-base ${
              value ? 'font-medium text-[#0D3B3E] dark:text-white' : 'text-[#7A8B90] dark:text-[#8FA8A6]'
            }`}
          >
            {value || label}
          </span>
        </span>

        {loadingList ? (
          <svg
            className="animate-spin text-[#2E8B9E] dark:text-[#6FE3B2]"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          >
            <circle cx="12" cy="12" r="9" strokeOpacity="0.3" />
            <path d="M21 12a9 9 0 0 0-9-9" strokeLinecap="round" />
          </svg>
        ) : (
          <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#EAF6EE] text-[#2E8B9E] dark:bg-white/10 dark:text-[#6FE3B2]">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
            >
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        )}
      </button>

      {/* Open state */}
      {open && (
        <div className="ds-pop absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-2xl border border-white/80 bg-white/95 shadow-[0_20px_50px_rgba(13,59,62,0.2)] backdrop-blur-xl dark:border-white/10 dark:bg-[#0C2226]/95 dark:shadow-[0_20px_50px_rgba(0,0,0,0.55)]">
          {/* Search bar */}
          <div className="flex items-center gap-2 border-b border-[#E3EEEC] px-4 py-3 dark:border-white/10">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-[#2E8B9E] dark:text-[#6FE3B2]"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
            </svg>
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setActive(0)
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search district"
              aria-label="Search district"
              className="flex-1 bg-transparent text-base text-[#2A2A28] outline-none placeholder:text-[#8FA3A3] dark:text-white dark:placeholder:text-[#6F8F8F]"
            />
            {value && (
              <button
                type="button"
                onClick={() => choose('')}
                className="rounded-full bg-[#EAF6EE] px-3 py-1 text-xs font-medium text-[#2E8B9E] transition hover:bg-[#d9efe2] dark:bg-white/10 dark:text-[#6FE3B2] dark:hover:bg-white/20"
              >
                Clear
              </button>
            )}
          </div>

          {/* List (scrollbar styled via ds-scroll) */}
          <ul ref={listRef} role="listbox" className="ds-scroll max-h-72 overflow-y-auto py-2 pr-1">
            {flat.length === 0 && (
              <li className="flex flex-col items-center gap-1 px-4 py-6 text-center text-sm text-[#7A8B90] dark:text-[#A9C6C4]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3.5-3.5M8.5 11h5" strokeLinecap="round" />
                </svg>
                No district found
              </li>
            )}

            {pinnedList.length > 0 && (
              <li role="presentation" className="px-3 pb-2">
                <div className="mb-2 flex items-center gap-2 px-1 pt-1 text-xs font-semibold uppercase tracking-widest text-[#2E8B9E] dark:text-[#6FE3B2]">
                  <span className="relative flex h-2 w-2">
                    <span className="ds-ping absolute inline-flex h-full w-full rounded-full bg-[#4FBE8E]" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#4FBE8E]" />
                  </span>
                  {pinnedLabel}
                </div>
                <ul role="presentation" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {pinnedList.map((c, i) => renderPinned(c, i))}
                </ul>
              </li>
            )}

            {groups.map((g) => (
              <li key={g.letter} role="presentation">
                <div className="sticky top-0 z-10 bg-white/90 px-4 py-1 text-xs font-bold tracking-widest text-[#2E8B9E] backdrop-blur dark:bg-[#0C2226]/90 dark:text-[#6FE3B2]">
                  {g.letter}
                </div>
                <ul role="presentation">{g.items.map((c, i) => renderRow(c, g.start + i))}</ul>
              </li>
            ))}
          </ul>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-[#E3EEEC] bg-[#F4FAF8] px-4 py-2 text-xs text-[#5C6B6F] dark:border-white/10 dark:bg-white/5 dark:text-[#A9C6C4]">
            <span>
              {flat.length} {flat.length === 1 ? 'district' : 'districts'}
            </span>
            <span className="hidden sm:inline">↑ ↓ to move · Enter to select · Esc to close</span>
          </div>
        </div>
      )}
    </div>
  )
}