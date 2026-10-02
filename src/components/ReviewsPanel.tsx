'use client'

// ============================================================
// IMPORTS
// ============================================================
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

// ============================================================
// TYPES
// ============================================================
type Review = {
  id: string
  patient_id: string
  rating: number
  comment: string | null
  created_at: string
}

type Props = {
  open: boolean
  doctorId: string
  doctorName: string
  commentsEnabled: boolean
  onClose: () => void
  onChanged: () => void // tells the page to refresh the rating badges
}

const RATING_WORDS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent']

// ============================================================
// SMALL STAR HELPERS
// ============================================================
function Star({ filled, size = 16 }: { filled: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? '#F2C14E' : 'none'}
      stroke={filled ? '#F2C14E' : '#CFC9B8'}
      strokeWidth="1.5"
      strokeLinejoin="round"
    >
      <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-4-6.3 4 1.7-7-5.4-4.7 7.1-.6z" />
    </svg>
  )
}

function StarRow({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={value + ' out of 5 stars'}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} filled={n <= value} size={size} />
      ))}
    </span>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// ============================================================
// POPUP
// ============================================================
export default function ReviewsPanel({
  open,
  doctorId,
  doctorName,
  commentsEnabled,
  onClose,
  onChanged,
}: Props) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [myPatientId, setMyPatientId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  // form
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)

  // ----------------------------------------------------------
  // Load reviews + find out if the logged-in user is a patient
  // ----------------------------------------------------------
  const reload = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser()
    const uid = auth.user?.id

    let pid: string | null = null
    if (uid) {
      const { data: p } = await supabase
        .from('Patient')
        .select('id')
        .eq('user_id', uid)
        .maybeSingle()
      pid = p?.id ?? null
    }
    setMyPatientId(pid)

    const { data, error: loadError } = await supabase
      .from('reviews')
      .select('id, patient_id, rating, comment, created_at')
      .eq('doctor_id', doctorId)
      .order('created_at', { ascending: false })

    if (loadError) {
      console.error('Error loading reviews:', loadError)
      setError('Could not load reviews. Please try again.')
      setReviews([])
      return
    }

    const list = (data as Review[]) ?? []
    setReviews(list)

    // If this patient already reviewed, fill the form with their review
    const own = pid ? list.find((r) => r.patient_id === pid) : undefined
    if (own) {
      setRating(own.rating)
      setComment(own.comment ?? '')
    }
  }, [doctorId])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError('')
    setMessage('')
    setRating(0)
    setHoverRating(0)
    setComment('')
    reload().finally(() => setLoading(false))
  }, [open, reload])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Stop the page behind from scrolling while the popup is open
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  if (!open) return null

  const ownReview = myPatientId ? reviews.find((r) => r.patient_id === myPatientId) : undefined
  const average =
    reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null
  const shownRating = hoverRating || rating

  // ----------------------------------------------------------
  // Save (insert a new review, or update the patient's own one)
  // ----------------------------------------------------------
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!myPatientId) return
    if (rating < 1) {
      setError('Tap a star to choose your rating.')
      return
    }

    setSaving(true)
    setError('')
    setMessage('')

    const cleanComment = commentsEnabled ? comment.trim() : ''
    const payload = { rating, comment: cleanComment === '' ? null : cleanComment }

    const { error: saveError } = ownReview
      ? await supabase.from('reviews').update(payload).eq('id', ownReview.id)
      : await supabase
          .from('reviews')
          .insert({ doctor_id: doctorId, patient_id: myPatientId, ...payload })

    if (saveError) {
      console.error('Error saving review:', saveError)
      setError('Could not save your review: ' + saveError.message)
      setSaving(false)
      return
    }

    await reload()
    onChanged()
    setMessage(ownReview ? 'Review updated.' : 'Review saved.')
    setSaving(false)
  }

  // ----------------------------------------------------------
  // Delete the patient's own review
  // ----------------------------------------------------------
  async function handleDelete() {
    if (!ownReview) return
    setSaving(true)
    setError('')
    setMessage('')

    const { error: deleteError } = await supabase.from('reviews').delete().eq('id', ownReview.id)

    if (deleteError) {
      console.error('Error deleting review:', deleteError)
      setError('Could not delete your review: ' + deleteError.message)
      setSaving(false)
      return
    }

    setRating(0)
    setComment('')
    await reload()
    onChanged()
    setMessage('Review deleted.')
    setSaving(false)
  }

  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={'Reviews for ' + doctorName}
    >
      <style>{`
        @keyframes sd-pop { from { opacity: 0; transform: translateY(8px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @media (prefers-reduced-motion: reduce) { .sd-pop { animation: none !important; } }
      `}</style>

      {/* Backdrop: click outside to close */}
      <button
        type="button"
        aria-label="Close reviews"
        onClick={onClose}
        className="absolute inset-0 bg-[#0D3B3E]/40 backdrop-blur-sm cursor-default"
      />

      {/* Popup card */}
      <div className="sd-pop relative w-full max-w-md max-h-[85vh] flex flex-col bg-[#FBFAF6] rounded-3xl shadow-[0_24px_70px_rgba(13,59,62,0.3)] overflow-hidden animate-[sd-pop_0.22s_ease-out]">
        {/* Soft glows, same family as the page background */}
        <div className="pointer-events-none absolute -top-16 -left-16 w-48 h-48 rounded-full bg-[#3FA9D6] opacity-20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-16 w-52 h-52 rounded-full bg-[#4FBE8E] opacity-20 blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 -right-12 w-32 h-32 rounded-full bg-[#F2C14E] opacity-[0.15] blur-3xl" />

        {/* Header */}
        <div className="relative px-5 pt-5 pb-4 flex items-start gap-3">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#3FA9D6] to-[#4FBE8E] flex items-center justify-center flex-shrink-0 shadow-md">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="1.5" strokeLinejoin="round">
              <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-4-6.3 4 1.7-7-5.4-4.7 7.1-.6z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-serif text-xl font-bold text-[#0D3B3E] leading-snug">
              {doctorName}
            </h2>
            {average != null ? (
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                <StarRow value={Math.round(average)} size={15} />
                <span className="text-sm font-semibold text-[#0D3B3E]">{average.toFixed(1)}</span>
                <span className="text-sm text-[#7A8B90]">
                  {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
                </span>
              </div>
            ) : (
              <p className="mt-0.5 text-sm text-[#7A8B90]">No reviews yet</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 flex-shrink-0 rounded-full bg-white text-[#5C6B6F] shadow-sm hover:text-[#0D3B3E] hover:shadow-md flex items-center justify-center transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="relative flex-1 overflow-y-auto px-5 pb-5 flex flex-col gap-4">
          {/* ---------------- Review form (patients only) ---------------- */}
          {myPatientId ? (
            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-2xl shadow-[0_4px_16px_rgba(13,59,62,0.08)] p-4 flex flex-col gap-3"
            >
              <div className="flex flex-col items-center gap-1">
                <p className="text-sm font-semibold text-[#0D3B3E]">
                  {ownReview ? 'Your review' : 'How was your experience?'}
                </p>
                <div className="flex items-center gap-1.5" onMouseLeave={() => setHoverRating(0)}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      aria-label={n + (n === 1 ? ' star' : ' stars')}
                      onClick={() => setRating(n)}
                      onMouseEnter={() => setHoverRating(n)}
                      className="p-0.5 rounded-md transition hover:scale-110 active:scale-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#3FA9D6]"
                    >
                      <Star filled={n <= shownRating} size={34} />
                    </button>
                  ))}
                </div>
                <p className="h-4 text-xs font-medium text-[#B8892A]">
                  {RATING_WORDS[shownRating]}
                </p>
              </div>

              {commentsEnabled ? (
                <div>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    maxLength={300}
                    rows={3}
                    placeholder="Add a comment (optional)"
                    className="w-full px-3 py-2.5 rounded-xl border border-[#D8D4C8] bg-white text-sm text-[#2A2A28] outline-none transition focus:border-[#3FA9D6] focus:ring-4 focus:ring-[#3FA9D6]/15 resize-none"
                  />
                  <p className="text-xs text-[#9CA39C] text-right mt-0.5">{comment.length}/300</p>
                </div>
              ) : (
                <p className="text-xs text-[#7A8B90] text-center">
                  Comments are turned off for this doctor.
                </p>
              )}

              {error ? (
                <p className="text-sm text-[#B3402A] bg-[#FDEAE6] rounded-lg px-3 py-2">{error}</p>
              ) : null}
              {message ? (
                <p className="text-sm text-[#2E8B6E] bg-[#E4F5EC] rounded-lg px-3 py-2">{message}</p>
              ) : null}

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#3FA9D6] to-[#4FBE8E] text-white text-sm font-medium shadow-[0_6px_18px_rgba(63,169,214,0.3)] hover:brightness-105 hover:-translate-y-0.5 active:scale-[0.99] transition disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {saving ? 'Saving...' : ownReview ? 'Update review' : 'Save review'}
                </button>
                {ownReview ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={saving}
                    className="py-2.5 px-4 rounded-xl border border-[#E8734A] text-[#E8734A] text-sm font-medium hover:bg-[#E8734A] hover:text-white transition disabled:opacity-60"
                  >
                    Delete
                  </button>
                ) : null}
              </div>
            </form>
          ) : !loading ? (
            <p className="text-sm text-[#5C6B6F] bg-white rounded-xl px-4 py-3 shadow-sm">
              Sign in with a patient account to leave a review.
            </p>
          ) : null}

          {/* Errors when there is no form (e.g. reviews failed to load) */}
          {!myPatientId && error ? (
            <p className="text-sm text-[#B3402A] bg-[#FDEAE6] rounded-lg px-3 py-2">{error}</p>
          ) : null}

          {/* ---------------- Reviews list ---------------- */}
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-[#5C6B6F]">
              <span className="w-4 h-4 rounded-full border-2 border-[#3FA9D6] border-t-transparent animate-spin" />
              Loading reviews...
            </div>
          ) : reviews.length === 0 ? (
            <p className="text-sm text-[#7A8B90] text-center">
              {myPatientId ? 'No reviews yet. Yours could be the first.' : 'No reviews yet.'}
            </p>
          ) : (
            <>
              <div className="h-px bg-gradient-to-r from-transparent via-[#CFC9B8] to-transparent" />
              <ul className="flex flex-col gap-3">
                {reviews.map((r) => (
                  <li
                    key={r.id}
                    className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(13,59,62,0.06)] px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <StarRow value={r.rating} size={14} />
                        <span className="text-sm font-medium text-[#1E2A2E]">
                          {r.patient_id === myPatientId ? 'You' : 'A patient'}
                        </span>
                      </div>
                      <span className="text-xs text-[#9CA39C]">{formatDate(r.created_at)}</span>
                    </div>
                    {r.comment ? (
                      <p className="mt-1.5 text-sm text-[#3B4649] leading-relaxed break-words">
                        {r.comment}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  )
}