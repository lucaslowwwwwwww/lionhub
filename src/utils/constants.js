// Role enums
export const ROLES = {
  ADMIN: 'admin',
  MEMBER: 'member',
}

// Stop status enums
export const STOP_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  SKIPPED: 'skipped',
}

// Itinerary status enums
export const ITINERARY_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  COMPLETED: 'completed',
}

export const CNY_DAYS = [
  { id: 'day1', label: 'Day 1', subLabel: '初一' },
  { id: 'day2', label: 'Day 2', subLabel: '初二' },
  { id: 'day3', label: 'Day 3', subLabel: '初三' },
  { id: 'day4', label: 'Day 4', subLabel: '初四' },
  { id: 'day5', label: 'Day 5', subLabel: '初五' },
  { id: 'day6', label: 'Day 6', subLabel: '初六' },
  { id: 'day7', label: 'Day 7', subLabel: '初七' },
  { id: 'day8', label: 'Day 8', subLabel: '初八' },
  { id: 'day9', label: 'Day 9', subLabel: '初九' },
  { id: 'day10', label: 'Day 10', subLabel: '初十' },
  { id: 'day11', label: 'Day 11', subLabel: '十一' },
  { id: 'day12', label: 'Day 12', subLabel: '十二' },
  { id: 'day13', label: 'Day 13', subLabel: '十三' },
  { id: 'day14', label: 'Day 14', subLabel: '十四' },
  { id: 'day15', label: 'Day 15', subLabel: '十五' },
]

// Mapping of CNY Day 1 Start Dates (YYYY-MM-DD)
// REMOVED: Users now set this manually in Settings
export const CNY_START_DATES = {}

/**
 * Calculates the actual calendar date for a CNY performance day
 * @param {string} dayId - e.g. 'day1'
 * @param {number} year - e.g. 2026
 * @param {Object} overrides - Manual date overrides { '2026': '2026-02-18' }
 * @returns {Date}
 */
export const getActualCnyDate = (dayId, year, overrides = {}) => {
  // dayId might be 'day1' or 'day1_2026'
  const baseDayId = dayId.split('_')[0]
  const targetYear = year || (dayId.includes('_') ? Number(dayId.split('_')[1]) : new Date().getFullYear())
  
  const overrideDate = overrides?.[targetYear]
  const startDateStr = overrideDate // Only use manual override now
  
  if (!startDateStr) {
    // Return current date as a fallback to prevent crashes if no override set
    return new Date()
  }

  const startDate = new Date(startDateStr)
  
  // Find index of day (day1 = 0, day2 = 1...)
  const dayIndex = CNY_DAYS.findIndex(d => d.id === baseDayId)
  if (dayIndex === -1) return startDate
  
  const actualDate = new Date(startDate)
  actualDate.setDate(startDate.getDate() + dayIndex)
  return actualDate
}

/**
 * Returns label and ID info for a given date, checking if it's a CNY day
 * @param {Date|string} date 
 * @param {Object} overrides - Manual date overrides { '2026': '2026-02-18' }
 * @returns {{ id: string, label: string, subLabel: string, isCny: boolean }}
 */
export const getDayInfo = (date, overrides = {}) => {
  const d = new Date(date)
  
  // Format local ISO date string YYYY-MM-DD
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const iso = `${year}-${month}-${day}`
  
  const overrideDate = overrides?.[year]
  const startDateStr = overrideDate || CNY_START_DATES[year]
  
  if (!startDateStr) {
    return {
      id: iso,
      label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      subLabel: d.toLocaleDateString('en-GB', { weekday: 'short' }),
      isCny: false
    }
  }

  const startDate = new Date(startDateStr)
  // Standardize both to midnight for accurate day diff
  const dMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const sMidnight = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
  
  const diffTime = dMidnight.getTime() - sMidnight.getTime()
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays >= 0 && diffDays < 15) {
    const cnyDay = CNY_DAYS[diffDays]
    return {
      id: cnyDay.id,
      label: cnyDay.label,
      subLabel: cnyDay.subLabel,
      isCny: true
    }
  }

  return {
    id: iso,
    label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    subLabel: d.toLocaleDateString('en-GB', { weekday: 'short' }),
    isCny: false
  }
}

/**
 * Accurately determines the Chinese Zodiac animal based on the Lunar Year transition.
 * @param {Date|string} date 
 * @param {Object} overrides - Manual date overrides { '2026': '2026-02-18' }
 * @returns {{ name: string, animal: string, char: string, color: string, year: number }}
 */
export const getChineseZodiac = (date = new Date(), overrides = {}) => {
  const d = new Date(date)
  const year = d.getFullYear()
  
  // Check if we are before or after this year's CNY start to determine the Lunar Year
  const overrideDate = overrides?.[year]
  const startDateStr = overrideDate || CNY_START_DATES[year]
  let zodiacYear = year
  
  if (startDateStr) {
    const startDate = new Date(startDateStr)
    if (d < startDate) {
      zodiacYear = year - 1
    }
  }

  const zodiacs = [
    { name: 'Monkey', animal: '🐒', char: '申猴', color: '#818cf8' },
    { name: 'Rooster', animal: '🐓', char: '酉鸡', color: '#f87171' },
    { name: 'Dog', animal: '🐕', char: '戌狗', color: '#fb923c' },
    { name: 'Pig', animal: '🐖', char: '亥猪', color: '#f472b6' },
    { name: 'Rat', animal: '🐀', char: '子鼠', color: '#94a3b8' },
    { name: 'Ox', animal: '🐂', char: '丑牛', color: '#d4d4d8' },
    { name: 'Tiger', animal: '🐅', char: '寅虎', color: '#fbbf24' },
    { name: 'Rabbit', animal: '🐇', char: '卯兔', color: '#34d399' },
    { name: 'Dragon', animal: '🐉', char: '辰龙', color: '#e11d48' },
    { name: 'Snake', animal: '🐍', char: '巳蛇', color: '#10b981' },
    { name: 'Horse', animal: '🐎', char: '午马', color: '#f59e0b' },
    { name: 'Goat', animal: '🐐', char: '未羊', color: '#a8a29e' }
  ]
  
  const info = zodiacs[zodiacYear % 12]
  return { ...info, year: zodiacYear }
}

/**
 * Formats a phone number for a WhatsApp wa.me link.
 * Handles Malaysia (+60) numbers specifically.
 * @param {string} phone 
 * @returns {string} - The wa.me URL
 */
export const formatWhatsAppLink = (phone) => {
  if (!phone) return ''
  // Remove all non-numeric characters
  let cleaned = phone.replace(/[^0-9]/g, '')
  
  // If it starts with '0', it's a local Malaysia number, prefix with '6' (WhatsApp needs international format)
  if (cleaned.startsWith('0')) {
    cleaned = '6' + cleaned
  } 
  // If it starts with '1' and is roughly the length of a mobile number, assume it's missing the 60
  else if (cleaned.startsWith('1') && (cleaned.length === 9 || cleaned.length === 10)) {
    cleaned = '60' + cleaned
  }

  return `https://wa.me/${cleaned}`
}

/**
 * Formats a phone number for a tel: link.
 * @param {string} phone 
 * @returns {string}
 */
export const formatPhoneForCall = (phone) => {
  if (!phone) return ''
  // Keep the + if it exists for international calls
  return `tel:${phone.replace(/[^0-9+]/g, '')}`
}
