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
const DEFAULT_PINNED = ['Nagpur', 'Gondia']

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

  // Pinned districts first, then everything else; both filtered by the search text
  const { pinnedList, restList, flat } = useMemo(() => {
    const q = search.trim().toLowerCase()
    const matches = (c: City) => c.Name.toLowerCase().includes(q)
    const pinnedList = pinned
      .map((n) => cities.find((c) => c.Name === n))
      .filter((c): c is City => !!c && matches(c))
    const restList = cities.filter((c) => !pinned.includes(c.Name) && matches(c))
    return { pinnedList, restList, flat: [...pinnedList, ...restList] }
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

  function renderItem(c: City, index: number) {
    const selected = c.Name === value
    return (
      <li
        key={c.id}
        role="option"
        aria-selected={selected}
        data-index={index}
        onMouseEnter={() => setActive(index)}
        onClick={() => choose(c.Name)}
        className={`flex cursor-pointer items-center justify-between px-4 py-2.5 text-base text-[#2A2A28] ${
          index === active ? 'bg-[#F3FBF6]' : ''
        }`}
      >
        <span className={selected ? 'font-medium text-[#0D3B3E]' : ''}>{c.Name}</span>
        {selected && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2E8B9E" strokeWidth="2.5">
            <path d="M5 12l5 5 9-10" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </li>
    )
  }

  const label = cities.length === 0 ? 'Loading districts...' : placeholder

  return (
    <div ref={rootRef} className="relative">
      {/* Closed state: looks like the old select */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openPanel())}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-lg border border-[#DCE6E9] bg-[#FAFCFC] px-4 py-2.5 text-left text-base outline-none transition-colors focus:border-[#2E8B9E]"
      >
        <span className={value ? 'text-[#2A2A28]' : 'text-[#7A8B90]'}>{value || label}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#7A8B90"
          strokeWidth="2"
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Open state */}
      {open && (
        <div className="absolute left-0 right-0 z-30 mt-1 overflow-hidden rounded-xl border border-[#DCE6E9] bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-[#DCE6E9] px-3 py-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7A8B90" strokeWidth="2">
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
              className="flex-1 bg-transparent text-base text-[#2A2A28] outline-none"
            />
            {value && (
              <button
                type="button"
                onClick={() => choose('')}
                className="text-sm text-[#2E8B9E] hover:underline"
              >
                Clear
              </button>
            )}
          </div>

          <ul ref={listRef} role="listbox" className="max-h-64 overflow-y-auto py-1">
            {flat.length === 0 && (
              <li className="px-4 py-3 text-sm text-[#7A8B90]">No district found</li>
            )}

            {pinnedList.length > 0 && (
              <>
                <li role="presentation" className="px-4 pb-1 pt-2 text-xs font-medium text-[#2E8B9E]">
                  {pinnedLabel}
                </li>
                {pinnedList.map((c, i) => renderItem(c, i))}
              </>
            )}

            {restList.length > 0 && (
              <>
                {pinnedList.length > 0 && (
                  <li role="presentation" className="px-4 pb-1 pt-3 text-xs font-medium text-[#7A8B90]">
                    All districts
                  </li>
                )}
                {restList.map((c, i) => renderItem(c, pinnedList.length + i))}
              </>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}