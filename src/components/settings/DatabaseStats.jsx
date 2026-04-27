import React from 'react'
import { useDatabaseStats } from '../../hooks/useDatabaseStats'

export function DatabaseStats() {
  const { stats, loading, error, refresh } = useDatabaseStats()

  if (loading && !stats) {
    return (
      <div className="bg-surface-900 border border-surface-800 rounded-2xl p-6 shadow-sm animate-pulse">
        <div className="h-4 bg-surface-800 rounded w-1/4 mb-4"></div>
        <div className="space-y-3">
          <div className="h-8 bg-surface-800 rounded w-full"></div>
          <div className="h-8 bg-surface-800 rounded w-full"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-surface-900 border border-crimson-900/50 rounded-2xl p-6 shadow-sm">
        <p className="text-crimson-400 text-sm font-medium">{error}</p>
        <button onClick={refresh} className="mt-3 text-xs font-bold text-surface-400 hover:text-surface-200 underline">Retry Calculation</button>
      </div>
    )
  }

  const freeLimit = 1 * 1024 * 1024 * 1024 // 1 GiB
  const usagePercent = Math.min((stats.estimatedBytes / freeLimit) * 100, 100).toFixed(4)
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="bg-surface-900 border border-surface-800 rounded-2xl p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-600/10 text-brand-500 rounded-lg">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-surface-100">Database Storage Stats</h2>
            <p className="text-[10px] text-surface-500 font-bold uppercase tracking-widest">Supabase Free Plan</p>
          </div>
        </div>
        <button 
          onClick={refresh}
          disabled={loading}
          className="p-2 rounded-lg hover:bg-surface-800 text-surface-400 transition-colors disabled:opacity-50"
          title="Refresh Stats"
        >
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <div className="space-y-4">
        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
            <span className="text-surface-400 font-bold">Estimated Storage Usage</span>
            <span className={Number(usagePercent) > 80 ? 'text-crimson-400' : 'text-green-500'}>{usagePercent}%</span>
          </div>
          <div className="h-3 bg-surface-950 rounded-full border border-surface-800 overflow-hidden p-0.5">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ease-out shadow-lg ${
                Number(usagePercent) > 80 ? 'bg-crimson-600 shadow-crimson-500/20' : 'bg-gradient-to-r from-green-600 to-green-400 shadow-green-500/20'
              }`}
              style={{ width: `${Math.max(Number(usagePercent), 1)}%` }}
            ></div>
          </div>
          <p className="mt-2 text-[10px] text-surface-500 font-medium italic">
            Estimated using ~750 bytes per document including standard indexing.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-2">
          <div className="p-3 bg-surface-950 rounded-xl border border-surface-800/50">
            <p className="text-[10px] font-black text-surface-500 uppercase tracking-widest mb-1">Total Items</p>
            <p className="text-xl font-black text-surface-50 tracking-tight">{stats.totalDocs.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-surface-950 rounded-xl border border-surface-800/50">
            <p className="text-[10px] font-black text-surface-500 uppercase tracking-widest mb-1">Used Space</p>
            <p className="text-xl font-black text-surface-50 tracking-tight">{formatBytes(stats.estimatedBytes)}</p>
          </div>
          <div className="p-3 bg-surface-950 rounded-xl border border-surface-800/50">
            <p className="text-[10px] font-black text-surface-500 uppercase tracking-widest mb-1">Plan Limit</p>
            <p className="text-xl font-black text-surface-50 tracking-tight">1.0 GB</p>
          </div>
          <div className="p-3 bg-surface-950 rounded-xl border border-surface-800/50">
            <p className="text-[10px] font-black text-surface-500 uppercase tracking-widest mb-1">Total Teams</p>
            <p className="text-xl font-black text-surface-50 tracking-tight">{stats.counts.troupes}</p>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="border-t border-surface-800/50 pt-4">
          <h3 className="text-xs font-black text-surface-400 uppercase tracking-widest mb-3">Collection Breakdown</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
            <div className="flex justify-between items-center py-1.5 border-b border-surface-800/30">
              <span className="text-sm text-surface-400 font-medium">Performance Stops</span>
              <span className="text-sm font-bold text-surface-100">{typeof stats.counts.stops === 'number' ? stats.counts.stops.toLocaleString() : stats.counts.stops}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-surface-800/30">
              <span className="text-sm text-surface-400 font-medium">Daily Itineraries</span>
              <span className="text-sm font-bold text-surface-100">{stats.counts.itineraries.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-surface-800/30">
              <span className="text-sm text-surface-400 font-medium">Finance Records</span>
              <span className="text-sm font-bold text-surface-100">{stats.counts.finance.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-surface-800/30">
              <span className="text-sm text-surface-400 font-medium">User Accounts</span>
              <span className="text-sm font-bold text-surface-100">{stats.counts.users.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-surface-800/30">
              <span className="text-sm text-surface-400 font-medium">Member Profiles</span>
              <span className="text-sm font-bold text-surface-100">{stats.counts.members.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-surface-800/30 border-brand-500/10">
              <span className="text-sm text-surface-400 font-medium">Customers (Contacts)</span>
              <span className="text-sm font-bold text-surface-100">{stats.counts.customers.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-surface-800/30 border-brand-500/10">
              <span className="text-sm text-surface-400 font-medium">Active Teams</span>
              <span className="text-sm font-bold text-surface-100">{stats.counts.troupes.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
