import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

/**
 * AddEventModal — Create or Edit a calendar event
 * Only rendered for admin/master users.
 */
export function AddEventModal({ isOpen, onClose, onSave, initialData = null, initialDate = null }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    color: 'blue'
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    if (initialData) {
      // Edit mode
      const startLocal = initialData.start_time
        ? new Date(initialData.start_time).toISOString().slice(0, 16)
        : ''
      const endLocal = initialData.end_time
        ? new Date(initialData.end_time).toISOString().slice(0, 16)
        : ''

      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        start_time: startLocal,
        end_time: endLocal,
        color: initialData.color || 'blue'
      })
    } else if (initialDate) {
      // New event on a clicked date
      const dateStr = `${initialDate}T09:00`
      const endStr = `${initialDate}T10:00`
      setFormData({
        title: '',
        description: '',
        start_time: dateStr,
        end_time: endStr,
        color: 'blue'
      })
    } else {
      setFormData({
        title: '',
        description: '',
        start_time: '',
        end_time: '',
        color: 'blue'
      })
    }
  }, [isOpen, initialData, initialDate])

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
        document.documentElement.style.overflow = ''
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  const isEdit = Boolean(initialData)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.title.trim()) return
    if (!formData.start_time || !formData.end_time) return

    setSaving(true)
    try {
      await onSave({
        title: formData.title.trim(),
        description: formData.description.trim(),
        start_time: new Date(formData.start_time).toISOString(),
        end_time: new Date(formData.end_time).toISOString(),
        color: formData.color
      })
      onClose()
    } catch (err) {
      alert('Failed to save event: ' + (err?.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  const colorOptions = [
    { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
    { value: 'green', label: 'Green', class: 'bg-emerald-500' },
    { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
    { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
    { value: 'pink', label: 'Pink', class: 'bg-pink-500' },
    { value: 'teal', label: 'Teal', class: 'bg-teal-500' },
  ]

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-surface-950/80 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-md bg-surface-900 border border-surface-800 rounded-3xl shadow-2xl overflow-hidden animate-slide-down" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 md:px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-surface-100 tracking-tight">{isEdit ? 'Edit Event' : 'Add Event'}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-4 md:px-6 pb-6 space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="event-title" className="block text-[11px] font-bold text-surface-400 uppercase tracking-widest mb-1.5">Subject *</label>
            <input
              id="event-title"
              name="event_title"
              type="text"
              value={formData.title}
              onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g. Team Meeting, Rehearsal..."
              className="w-full px-4 py-3 bg-surface-800 border border-surface-700 rounded-xl text-surface-100 placeholder-surface-500 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
              required
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="event-description" className="block text-[11px] font-bold text-surface-400 uppercase tracking-widest mb-1.5">Description</label>
            <textarea
              id="event-description"
              name="event_description"
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optional details..."
              rows={3}
              className="w-full px-4 py-3 bg-surface-800 border border-surface-700 rounded-xl text-surface-100 placeholder-surface-500 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all resize-none"
            />
          </div>

          {/* Start Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="event-start-time" className="block text-[11px] font-bold text-surface-400 uppercase tracking-widest mb-1.5">Start *</label>
              <div className="w-full bg-surface-800 border border-surface-700 rounded-xl overflow-hidden focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all">
                <input
                  id="event-start-time"
                  name="event_start_time"
                  type="datetime-local"
                  value={formData.start_time}
                  onChange={e => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                  className="w-full px-2 sm:px-3 py-3 bg-transparent text-surface-100 text-xs sm:text-sm focus:outline-none [color-scheme:dark]"
                  required
                />
              </div>
            </div>
            <div>
              <label htmlFor="event-end-time" className="block text-[11px] font-bold text-surface-400 uppercase tracking-widest mb-1.5">End *</label>
              <div className="w-full bg-surface-800 border border-surface-700 rounded-xl overflow-hidden focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all">
                <input
                  id="event-end-time"
                  name="event_end_time"
                  type="datetime-local"
                  value={formData.end_time}
                  onChange={e => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                  className="w-full px-2 sm:px-3 py-3 bg-transparent text-surface-100 text-xs sm:text-sm focus:outline-none [color-scheme:dark]"
                  required
                />
              </div>
            </div>
          </div>

          {/* Color Selector */}
          <div>
            <label className="block text-[11px] font-bold text-surface-400 uppercase tracking-widest mb-2">Color</label>
            <div className="flex gap-2">
              {colorOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, color: opt.value }))}
                  className={`w-8 h-8 rounded-full ${opt.class} transition-all ${
                    formData.color === opt.value
                      ? 'ring-2 ring-offset-2 ring-offset-surface-900 ring-white scale-110'
                      : 'opacity-50 hover:opacity-80'
                  }`}
                  title={opt.label}
                />
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-surface-800 hover:bg-surface-700 text-surface-300 font-bold text-xs uppercase tracking-widest rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !formData.title.trim()}
              className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-surface-800 disabled:text-surface-500 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                isEdit ? 'Update' : 'Create Event'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}


/**
 * EventDetailModal — Shows details for a Performance or Custom Event
 */
export function EventDetailModal({ isOpen, onClose, event, onEdit, onDelete, isAdmin }) {
  const [deleting, setDeleting] = useState(false)

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
        document.documentElement.style.overflow = ''
      }
    }
  }, [isOpen])

  if (!isOpen || !event) return null

  const isPerformance = event.type === 'performance'
  const isEvent = event.type === 'event'
  const canModify = isEvent && isAdmin

  const formatTime = (date) => {
    if (!date) return '—'
    return new Date(date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })
  }

  const formatDate = (date) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this event?')) return
    setDeleting(true)
    try {
      await onDelete(event.id)
      onClose()
    } catch (err) {
      alert('Failed to delete: ' + (err?.message || 'Unknown error'))
    } finally {
      setDeleting(false)
    }
  }

  // Color mapping for the accent bar
  const colorMap = {
    crimson: 'bg-crimson-500',
    blue: 'bg-blue-500',
    green: 'bg-emerald-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
    pink: 'bg-pink-500',
    teal: 'bg-teal-500',
    gold: 'bg-gold-500',
  }
  const accentClass = colorMap[event.color] || 'bg-blue-500'

  // Color mapping for light badge backgrounds
  const badgeBgMap = {
    crimson: 'bg-crimson-500/10 text-crimson-400',
    blue: 'bg-blue-500/10 text-blue-400',
    green: 'bg-emerald-500/10 text-emerald-400',
    purple: 'bg-purple-500/10 text-purple-400',
    orange: 'bg-orange-500/10 text-orange-400',
    pink: 'bg-pink-500/10 text-pink-400',
    teal: 'bg-teal-500/10 text-teal-400',
    gold: 'bg-gold-500/10 text-gold-400',
  }
  const badgeClass = badgeBgMap[event.color] || 'bg-blue-500/10 text-blue-400'

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-surface-950/80 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-md bg-surface-900 border border-surface-800 rounded-3xl shadow-2xl overflow-hidden animate-slide-down" onClick={e => e.stopPropagation()}>
        {/* Color accent bar */}
        <div className={`h-1.5 ${accentClass}`} />

        {/* Header */}
        <div className="px-6 pt-5 pb-4 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${badgeClass}`}>
                {isPerformance ? '🦁 Performance' : '📅 Event'}
              </span>
            </div>
            <h2 className="text-xl font-bold text-surface-100 tracking-tight truncate">{event.title}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-colors shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 space-y-4">
          {/* Date & Time */}
          <div className="flex items-center gap-3 p-3 bg-surface-800/50 rounded-xl">
            <div className="w-9 h-9 rounded-lg bg-surface-700 flex items-center justify-center shrink-0">
              <svg className="w-4.5 h-4.5 text-surface-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-surface-200">{formatDate(event.start)}</p>
              {isEvent && (
                <p className="text-xs text-surface-400">
                  {formatTime(event.start)} — {formatTime(event.end)}
                </p>
              )}
            </div>
          </div>

          {/* Description — only for custom events */}
          {event.description && !isPerformance && (
            <div className="p-3 bg-surface-800/50 rounded-xl">
              <p className="text-[11px] font-bold text-surface-500 uppercase tracking-widest mb-1.5">Description</p>
              <p className="text-sm text-surface-300 leading-relaxed whitespace-pre-wrap">{event.description}</p>
            </div>
          )}

          {/* Performance-specific details */}
          {isPerformance && (
            <div className="p-3 bg-surface-800/50 rounded-xl flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-crimson-500/10 flex items-center justify-center shrink-0">
                <span className="text-lg font-black text-crimson-400">{event.totalStops}</span>
              </div>
              <p className="text-sm font-semibold text-surface-300">Total Stops</p>
            </div>
          )}

          {/* Action Buttons — only for custom events AND admin/master */}
          {canModify && (
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  onEdit(event)
                  onClose()
                }}
                className="flex-1 py-3 px-4 bg-surface-800 hover:bg-surface-700 text-surface-200 font-bold text-xs uppercase tracking-widest rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-3 px-4 bg-crimson-600/10 hover:bg-crimson-600/20 text-crimson-400 font-bold text-xs uppercase tracking-widest rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <div className="w-4 h-4 border-2 border-crimson-400/20 border-t-crimson-400 rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
