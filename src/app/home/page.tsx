'use client'

// ============================================================
// IMPORTS
// ============================================================
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabaseClient'
import DistrictSelect from '@/components/DistrictSelect'

// ============================================================
// TYPES
// ============================================================
type City = { id: string; Name: string }
type Specialty = { id: string; name: string }
type Symptom = { id: string; Name: string; specialties: Specialty[] }

// Symptoms shown as quick pills under the search bar
const POPULAR_NAMES = ['Fever', 'Headache', 'Cough', 'Back Pain', 'Stomach Pain']

export default function HomePage() {
  const router = useRouter()

  const [cities, setCities] = useState<City[]>([])
  const [symptoms, setSymptoms] = useState<Symptom[]>([])
  const [city, setCity] = useState('')
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState('')
  const [recent, setRecent] = useState<string[]>([])

  // ============================================================
  // LOAD DATA ON MOUNT
  // ============================================================
  useEffect(() => {
    // Cities
    supabase
      .from('City')
      .select('id, Name')
      .order('Name')
      .then(({ data, error }) => {
        if (error) {
          console.error('Error loading cities:', error)
          return
        }
        if (data) setCities(data)
      })

    // Symptoms with all their linked specialties
    async function loadSymptoms() {
      const { data, error } = await supabase
        .from('Symptom')
        .select('id, Name, SymptomSpecialty(Speciality(id, name))')
        .order('Name')

      if (!error && data && data.length > 0) {
        setSymptoms(
          data.map((s: any) => ({
            id: s.id,
            Name: s.Name,
            specialties: (s.SymptomSpecialty ?? [])
              .map((x: any) => x.Speciality)
              .filter(Boolean),
          }))
        )
        return
      }

      // Fallback: if the join query fails or returns nothing, still load plain symptoms
      console.error('Symptoms with specialties failed or came back empty:', error)
      const { data: plain, error: plainError } = await supabase
        .from('Symptom')
        .select('id, Name')
        .order('Name')
      if (plainError) {
        console.error('Error loading symptoms:', plainError)
        return
      }
      setSymptoms((plain ?? []).map((s: any) => ({ id: s.id, Name: s.Name, specialties: [] })))
    }
    loadSymptoms()

    // Recent searches
    try {
      const stored = localStorage.getItem('recentSearches')
      if (stored) setRecent(JSON.parse(stored))
    } catch {
      localStorage.removeItem('recentSearches')
    }
  }, [])

  // ============================================================
  // DERIVED DATA
  // ============================================================
  const popular = useMemo(() => {
    const byName = POPULAR_NAMES.map((n) => symptoms.find((s) => s.Name === n)).filter(
      (s): s is Symptom => Boolean(s)
    )
    return byName.length > 0 ? byName : symptoms.slice(0, 5)
  }, [symptoms])

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q || notice) return []
    return symptoms
      .filter((s) => s.Name.toLowerCase().includes(q))
      .sort((a, b) => {
        const aStart = a.Name.toLowerCase().startsWith(q) ? 0 : 1
        const bStart = b.Name.toLowerCase().startsWith(q) ? 0 : 1
        return aStart - bStart || a.Name.localeCompare(b.Name)
      })
  }, [query, symptoms, notice])

  const showNoMatch =
    query.trim().length > 0 && symptoms.length > 0 && suggestions.length === 0 && !notice

  // ============================================================
  // HELPERS
  // ============================================================
  function saveRecent(name: string) {
    const updated = [name, ...recent.filter((r) => r !== name)].slice(0, 5)
    setRecent(updated)
    localStorage.setItem('recentSearches', JSON.stringify(updated))
  }

  // Sends ALL linked specialties to the doctors page (comma-separated ids)
  function goToDoctors(specialties: Specialty[]) {
    const params = new URLSearchParams({
      specialty: specialties.map((s) => s.id).join(','),
    })
    if (city) params.set('city', city)
    router.push(`/doctors?${params.toString()}`)
  }

  function selectSymptom(symptom: Symptom) {
    saveRecent(symptom.Name)
    if (symptom.specialties.length === 0) {
      setQuery(symptom.Name)
      setNotice(`No doctors are linked to “${symptom.Name}” yet.`)
      return
    }
    goToDoctors(symptom.specialties)
  }

  function handleFindDoctors() {
    const q = query.trim().toLowerCase()
    if (!q) return
    const match = symptoms.find((s) => s.Name.toLowerCase() === q) ?? suggestions[0]
    if (match) selectSymptom(match)
  }

  function handleRecentClick(name: string) {
    const match = symptoms.find((s) => s.Name === name)
    if (match) selectSymptom(match)
    else setQuery(name)
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#EFEEE6]">
      <div className="pointer-events-none absolute -top-40 -left-32 w-[600px] h-[600px] rounded-full bg-[#3FA9D6] opacity-20 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-40 w-[550px] h-[550px] rounded-full bg-[#4FBE8E] opacity-20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-100px] left-1/3 w-[500px] h-[500px] rounded-full bg-[#F2C14E] opacity-[0.15] blur-3xl" />
      <div className="pointer-events-none absolute top-10 right-1/4 w-[350px] h-[350px] rounded-full bg-[#E8734A] opacity-[0.12] blur-3xl" />

      <div className="relative max-w-2xl mx-auto px-6 py-5 flex flex-col gap-3">
        {/* LOCATION CARD */}
        <div className="relative z-30 bg-white/90 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgba(13,59,62,0.1)] p-4">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3FA9D6] to-[#2E8B9E] flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#1E2A2E]">Select Your Location</h2>
              <p className="text-sm text-[#7A8B90]">Choose your district to find nearby doctors</p>
            </div>
          </div>
          <DistrictSelect cities={cities} value={city} onChange={setCity} />
          <p className="text-sm text-[#B99B4A] bg-[#FDF6E3] rounded-lg px-4 py-2 mt-2">
            💡 Tip: Selecting your district helps us show doctors nearest to you.
          </p>
        </div>

        {/* HERO SEARCH CARD */}
        <div className="relative z-20 rounded-2xl bg-gradient-to-br from-[#DFF1F7] via-[#EAF6EE] to-[#EAF6EE] shadow-[0_8px_30px_rgba(13,59,62,0.1)] p-5 md:p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3FA9D6] to-[#5EC49A] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M3 12h4l2 7 4-14 2 7h6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="text-3xl font-serif font-bold">
              <span className="text-[#3FA9D6]">Suggest</span>
              <span className="text-[#4FBE8E]">Doc</span>
            </h1>
          </div>
          <p className="text-base text-[#5C6B6F] mb-3">
            Find the perfect doctor{city ? ` in ${city}, Maharashtra` : ''} for your
            health concerns
          </p>

          <div className="relative max-w-xl mx-auto">
            <div className="flex items-center bg-white rounded-full shadow-md overflow-hidden">
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setNotice('')
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleFindDoctors()
                }}
                placeholder="Describe your health problem (e.g., stomachache, fever...)"
                className="flex-1 px-5 py-3 text-base outline-none text-[#2A2A28]"
              />
              <button
                onClick={handleFindDoctors}
                className="flex items-center gap-1.5 px-5 py-3 bg-gradient-to-r from-[#3FA9D6] to-[#4FBE8E] text-white text-base font-medium whitespace-nowrap hover:brightness-105 transition"
              >
                🔍 Find Doctors
              </button>
            </div>

            {suggestions.length > 0 && (
              <div className="absolute left-0 right-0 mt-1 bg-white rounded-xl shadow-lg text-left overflow-hidden z-10">
                {suggestions.slice(0, 6).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => selectSymptom(s)}
                    className="w-full text-left px-5 py-2.5 text-base text-[#2A2A28] hover:bg-[#F3FBF6]"
                  >
                    {s.Name}
                  </button>
                ))}
              </div>
            )}

            {showNoMatch && (
              <div className="absolute left-0 right-0 mt-1 bg-white rounded-xl shadow-lg text-left z-10 px-5 py-3 text-sm text-[#7A8B90]">
                No matching symptom found. Try a different word.
              </div>
            )}
          </div>

          {notice && (
            <div className="max-w-xl mx-auto mt-3 rounded-xl bg-white/80 px-4 py-3 text-sm text-[#7A8B90]">
              {notice}
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-3 mt-3">
            {popular.length === 0 && (
              <span className="text-sm text-[#7A8B90]">Loading symptoms...</span>
            )}
            {popular.map((s) => (
              <button
                key={s.id}
                onClick={() => selectSymptom(s)}
                className="text-sm px-3 py-1 rounded-full bg-white/60 text-[#2E8B9E] hover:bg-white transition"
              >
                {s.Name}
              </button>
            ))}
          </div>
        </div>

        {/* RECENT SEARCHES */}
        {recent.length > 0 && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgba(13,59,62,0.1)] p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5C6B6F" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 3" />
              </svg>
              <h3 className="text-base font-medium text-[#1E2A2E]">Recent Searches</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {recent.map((name) => (
                <button
                  key={name}
                  onClick={() => handleRecentClick(name)}
                  className="text-sm px-3 py-1.5 rounded-full border border-[#CFE3E9] text-[#3FA9D6] bg-white hover:bg-[#F3FBF6] transition"
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgba(13,59,62,0.1)] p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5C6B6F" strokeWidth="2">
              <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
            </svg>
            <span className="text-base font-serif font-medium text-[#1E2A2E]">SuggestDoc</span>
          </div>

          <p className="text-sm text-[#B3402A] bg-[#FDEAE6] rounded-lg px-4 py-2 mb-3 max-w-lg mx-auto">
            ⚠️ Important Disclaimer: SuggestDoc is for guidance only, not
            medical advice. Please consult a licensed doctor for proper
            diagnosis and treatment.
          </p>

          <p className="text-sm text-[#7A8B90] mb-3">
            Made with ❤️ for the people{city ? ` of ${city}, Maharashtra` : ' of Maharashtra'}
          </p>

          <div className="border-t border-[#DCE6E9] pt-3">
            <p className="text-sm text-[#7A8B90] mb-2">Created by</p>
            <div className="flex flex-col items-center gap-1">
              <Image
                src="/dp2.png"
                alt="Nilesh Sillare"
                width={80}
                height={80}
                className="w-20 h-20 rounded-full object-cover shadow-md"
              />
              <p className="text-base font-medium text-[#1E2A2E]">Nilesh S. Sillare</p>
              <p className="text-sm text-[#7A8B90]">Creator &amp; Developer</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}