export default function StatusBadge({ status }) {
  const configs = {
    pending: { bg: 'bg-surface-800', text: 'text-surface-400', border: 'border-surface-700', label: 'Pending' },
    'in-progress': { bg: 'bg-gold-500/10 dark:bg-gold-500/20', text: 'text-gold-600 dark:text-gold-400', border: 'border-gold-500/20 dark:border-gold-500/40', label: 'En Route' },
    performing: { bg: 'bg-brand-500/10 dark:bg-brand-500/20', text: 'text-brand-600 dark:text-brand-400', border: 'border-brand-500/20 dark:border-brand-500/40', label: 'Arrived' },
    completed: { bg: 'bg-green-500/10 dark:bg-green-500/20', text: 'text-green-600 dark:text-green-400', border: 'border-green-500/20 dark:border-green-500/40', label: 'Done' },
    skipped: { bg: 'bg-crimson-500/10 dark:bg-crimson-500/20', text: 'text-crimson-600 dark:text-crimson-400', border: 'border-crimson-500/20 dark:border-crimson-500/40', label: 'Skipped' }
  }

  const active = configs[status] || configs.pending

  return (
    <span className={`px-2.5 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider rounded-full border ${active.bg} ${active.text} ${active.border}`}>
      {active.label}
    </span>
  )
}
