// Removed top-level heavy imports to reduce TBT. They are now dynamic inside functions.

// ─────────────────────────────────────────────────────────────
// SHARED HELPERS
// ─────────────────────────────────────────────────────────────

const renderChineseAsImage = (text, fontSize = 40) => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  ctx.font = `${fontSize}px "Microsoft YaHei", "SimSun", "STHeiti", sans-serif`
  const metrics = ctx.measureText(text)
  canvas.width = metrics.width
  canvas.height = fontSize * 1.2
  ctx.font = `${fontSize}px "Microsoft YaHei", "SimSun", "STHeiti", sans-serif`
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#000000'
  ctx.fillText(text, 0, canvas.height / 2)
  return { data: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height }
}

const addImageToPdf = (doc, url, x, y, w, h, opacity = 1) => {
  return new Promise((resolve) => {
    const img = new Image()
    img.src = url
    img.onload = () => {
      if (opacity < 1) {
        doc.saveGraphicsState()
        doc.setGState(new doc.GState({ opacity }))
      }
      doc.addImage(img, 'JPEG', x, y, w, h)
      if (opacity < 1) doc.restoreGraphicsState()
      resolve()
    }
    img.onerror = () => resolve()
  })
}

/** Preloads an image for synchronous use in jsPDF hooks. */
const preloadImage = (url) => {
  return new Promise((resolve) => {
    const img = new Image()
    img.src = url
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
  })
}

/** Draws watermark and footer on the current page. Synchronous. Idempotent per page. */
const drawWatermarkAndFooter = (doc, logoImg, trackedPages = new Set()) => {
  const pageNum = doc.internal.getCurrentPageInfo().pageNumber
  if (trackedPages.has(pageNum)) return
  trackedPages.add(pageNum)

  const pageW = doc.internal.pageSize.width
  const pageH = doc.internal.pageSize.height

  // 1. Watermark (Centered)
  if (logoImg) {
    const size = 150
    const x = (pageW - size) / 2
    const y = (pageH - size) / 2
    doc.saveGraphicsState()
    doc.setGState(new doc.GState({ opacity: 0.08 }))
    doc.addImage(logoImg, 'JPEG', x, y, size, size)
    doc.restoreGraphicsState()
  }

  // 2. Footer
  const footerY = pageH - 8
  doc.setFontSize(7)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(150)
  doc.text(`Generated on ${new Date().toLocaleString()} — Lionhub`, 15, footerY)
  doc.setTextColor(0)
}

/** Adds the standard club header to a jsPDF document. Returns the Y position after the header. */
const addClubHeader = async (doc, settings, reportTitle, defaultFont = 'helvetica') => {
  const clubNameEn = settings?.clubnameen || ''
  const clubNameCn = settings?.clubnamecn || ''
  const clubRegNo = settings?.clubregistrationno || ''
  const clubPhone = settings?.clubphone || ''
  const logoUrl = settings?.clublogo || null

  const pageW = doc.internal.pageSize.width
  const centerX = pageW / 2

  // Header Logo (small, top-left)
  if (logoUrl) {
    await addImageToPdf(doc, logoUrl, 15, 10, 25, 25)
  }

  // English name
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  const splitName = doc.splitTextToSize(clubNameEn.toUpperCase(), 150)
  doc.text(splitName, centerX, 15, { align: 'center' })

  // Chinese name
  const cnImg = renderChineseAsImage(clubNameCn)
  const cnY = 15 + splitName.length * 6
  doc.addImage(cnImg.data, 'PNG', centerX - 40, cnY, 80, 7)

  // Registration
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(clubRegNo, centerX, cnY + 10, { align: 'center' })

  // Phone
  doc.text(`HP: ${clubPhone}`, centerX, cnY + 15, { align: 'center' })

  // Divider
  const divY = cnY + 19
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.line(15, divY, pageW - 15, divY)

  // Report title
  doc.setFontSize(11)
  doc.setFont(defaultFont, 'bold')
  doc.text(reportTitle.toUpperCase(), centerX, divY + 7, { align: 'center' })

  return divY + 12
}

// Color + Plucking label maps
const colorMap = {
  '黄': 'Yellow', '黄红': 'Yellow-Red', '红': 'Red', '黑': 'Black', '紫': 'Purple',
  '橙': 'Orange', '青': 'Green', '白': 'White', '金': 'Gold', '银': 'Silver'
}
const pluckingMap = {
  '五福临门': 'Wu Fu Lin Men', '步步高升': 'Bu Bu Gao Sheng',
  '招财进宝': 'Zhao Cai Jin Bao', '满地黄金': 'Man Di Huang Jin',
  '车青': 'Che Qing', '地主': 'Di Zhu'
}

// Chinese font cache
let chineseFontBase64 = null

export const loadChineseFont = async () => {
  if (chineseFontBase64) return chineseFontBase64
  try {
    const response = await fetch('/NotoSansSC.ttf')
    const buffer = await response.arrayBuffer()
    let binary = ''
    const bytes = new Uint8Array(buffer)
    // process in chunks to avoid stack overflow
    const chunkSize = 8192
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, bytes.slice(i, i + chunkSize))
    }
    chineseFontBase64 = window.btoa(binary)
    return chineseFontBase64
  } catch (err) {
    console.error("Operation failed:", err?.message || "unknown")
    return null
  }
}

// Formatters for both PDF and Excel (now supporting Chinese)
const formatColorsExcel = (lionColor) => {
  if (!lionColor) return '-'
  const arr = Array.isArray(lionColor) ? lionColor : [lionColor]
  
  return arr.map(c => {
    if (!c) return '-'
    // If it's already a combined string like "黄 | Yellow" or "黄 Yellow"
    if (typeof c === 'string' && (c.includes('|') || c.includes(' '))) {
      const parts = c.split(/[| ]+/).map(p => p.trim()).filter(Boolean)
      if (parts.length >= 2) {
        return `${parts[0]} (${parts[1]})`
      }
      return c
    }
    // Otherwise look up in map
    const translation = colorMap[c]
    return translation ? `${c} (${translation})` : c
  }).join(', ')
}

const formatPluckingExcel = (pluckingType) => {
  if (!pluckingType) return '-'
  const arr = Array.isArray(pluckingType) ? pluckingType : [pluckingType]
  if (arr.length === 0) return '-'
  
  return arr.map(t => {
    if (!t) return '-'
    // If it's already a combined string
    if (typeof t === 'string' && (t.includes('|') || t.includes(' '))) {
      const parts = t.split(/[| ]+/).map(p => p.trim()).filter(Boolean)
      if (parts.length >= 2) {
        return `${parts[0]} (${parts[1]})`
      }
      return t
    }
    const translation = pluckingMap[t]
    return translation ? `${t} (${translation})` : t
  }).join(', ')
}

const formatColorsPDF = formatColorsExcel
const formatPluckingPDF = formatPluckingExcel



const getTimestampMs = (ts) => {
  if (!ts) return 0
  if (typeof ts.toMillis === 'function') return ts.toMillis()
  if (typeof ts.toDate === 'function') return ts.toDate().getTime()
  if (ts.seconds) return ts.seconds * 1000
  return new Date(ts).getTime()
}

const calcDuration = (stop) => {
  if (stop.performancestartedat && stop.completedat) {
    const startMs = getTimestampMs(stop.performancestartedat)
    const endMs = getTimestampMs(stop.completedat)
    if (startMs && endMs) return `${Math.max(1, Math.round((endMs - startMs) / 60000))}m`
  }
  return '-'
}

const buildPerformanceDetails = (stop) => {
  const parts = []
  if (stop.hasgodofwealth) parts.push('财神爷 (GOW)')
  if (stop.hasbigheadbuddha) parts.push('大头佛 (BHB)')
  return parts.length > 0 ? parts.join(', ') : '-'
}

const buildDuration = (stop) => {
  const est = `${stop.duration || 30}m`
  const perf = calcDuration(stop)
  if (perf !== '-') return `${est} / ${perf}`
  return est
}

// ─────────────────────────────────────────────────────────────
// COMBINED ITINERARY + ROSTER EXPORT
// ─────────────────────────────────────────────────────────────

const formatTimeOnly = (isoString) => {
  if (!isoString) return '-'
  try {
    const d = new Date(isoString)
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })
  } catch {
    return '-'
  }
}

const calcCheckInDuration = (inIso, outIso) => {
  if (!inIso) return '-'
  try {
    const start = new Date(inIso).getTime()
    const end = outIso ? new Date(outIso).getTime() : Date.now()
    const diffMs = end - start
    if (diffMs <= 0) return '0h 0m'
    const totalMins = Math.round(diffMs / 60000)
    const hours = Math.floor(totalMins / 60)
    const mins = totalMins % 60
    return `${hours}h ${mins}m`
  } catch {
    return '-'
  }
}

export const exportDayReportPDF = async (stops, members, attendanceDetails, settings, meta, checkIns = []) => {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const doc = new jsPDF({ orientation: 'landscape' })
  
  // Load and add Chinese font
  const fontBase64 = await loadChineseFont()
  if (fontBase64) {
    doc.addFileToVFS('NotoSansSC.ttf', fontBase64)
    doc.addFont('NotoSansSC.ttf', 'NotoSansSC', 'normal')
    doc.addFont('NotoSansSC.ttf', 'NotoSansSC', 'bold') // fallback mapping
  }
  const defaultFont = fontBase64 ? 'NotoSansSC' : 'helvetica'

  const title = `Daily Report — ${meta.dayLabel || meta.dateKey} — ${meta.troupename || 'All Teams'}`
  const logoUrl = settings?.clublogo || null
  const logoImg = logoUrl ? await preloadImage(logoUrl) : null
  const trackedPages = new Set()

  // Add Watermark & Footer to first page before header
  drawWatermarkAndFooter(doc, logoImg, trackedPages)

  const startY = await addClubHeader(doc, settings, title, defaultFont)

  // ── PAGE 1: ROSTER ──
  doc.setFontSize(9)
  doc.setFont(defaultFont, 'bold')
  doc.text(`ROSTER (${members.length} Members)`, 15, startY)

  const sortedMembers = [...members].sort((a, b) => (a.displayname || '').localeCompare(b.displayname || ''))

  const rosterRows = sortedMembers.map((m, i) => {
    const memberCheckIn = (checkIns || []).find(c => c.member_id === m.id)
    const checkInStr = memberCheckIn ? formatTimeOnly(memberCheckIn.check_in_at) : '-'
    const checkOutStr = memberCheckIn ? (memberCheckIn.check_out_at ? formatTimeOnly(memberCheckIn.check_out_at) : 'ACTIVE') : '-'
    const durationStr = memberCheckIn ? calcCheckInDuration(memberCheckIn.check_in_at, memberCheckIn.check_out_at) : '-'

    return [
      i + 1,
      m.displayname || '-',
      checkInStr,
      checkOutStr,
      durationStr
    ]
  })

  autoTable(doc, {
    startY: startY + 3,
    theme: 'grid',
    styles: { font: defaultFont, fontSize: 8, cellPadding: 3, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.1 },
    headStyles: { font: defaultFont, fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
    head: [['#', 'NAME', 'CHECK IN', 'CHECK OUT', 'DURATION']],
    body: rosterRows.length > 0 ? rosterRows : [['', 'No members assigned', '', '', '']],
    columnStyles: {
      0: { halign: 'center', cellWidth: 15 },
      2: { halign: 'center', cellWidth: 40 },
      3: { halign: 'center', cellWidth: 40 },
      4: { halign: 'center', cellWidth: 40 }
    },
    didDrawPage: () => {
      drawWatermarkAndFooter(doc, logoImg, trackedPages)
    }
  })

  // ── PAGE 2: ITINERARY (new page) ──
  doc.addPage('landscape')
  drawWatermarkAndFooter(doc, logoImg, trackedPages)

  const pageW = doc.internal.pageSize.width
  const centerX = pageW / 2

  doc.setFontSize(11)
  doc.setFont(defaultFont, 'bold')
  doc.text(`ITINERARY — ${(meta.dayLabel || meta.dateKey).toUpperCase()} — ${(meta.troupename || 'ALL TEAMS').toUpperCase()}`, centerX, 15, { align: 'center' })

  doc.setFontSize(9)
  doc.setFont(defaultFont, 'normal')
  doc.text(`${stops.length} Stops`, 15, 22)

  // 13 columns that fit within landscape A4 (~267mm usable)
  // #(7) + Time(15) + Customer(30) + Address(40) + Phone(22) + Qty(8) + Colors(30) + CaiQing(30) + Extras(14) + Quote(16) + Actual(16) + Duration(18) + Status(16) + Remarks(25) 
  // = 267 — perfect fit with auto overflow

  const itinRows = stops.map((s, i) => [
    i + 1,
    s.scheduledtime || '-',
    s.householdname || '-',
    s.address || '-',
    s.phone || '-',
    s.lionquantity || '-',
    formatColorsPDF(s.lioncolor),
    formatPluckingPDF(s.pluckingtype),
    buildPerformanceDetails(s),
    `RM${s.amount || 0}`,
    s.status === 'completed' ? `RM${s.actualamount ?? s.amount ?? 0}` : '-',
    s.status === 'completed' ? (s.paymentmethod || 'Cash') : '-',
    buildDuration(s),
    (s.status || 'pending').toUpperCase(),
    s.remarks || '-'
  ])

  const totalQuote = stops.reduce((sum, s) => sum + (Number(s.amount) || 0), 0)
  const totalActual = stops.filter(s => s.status === 'completed').reduce((sum, s) => sum + (Number(s.actualamount) || Number(s.amount) || 0), 0)

  autoTable(doc, {
    startY: 26,
    theme: 'grid',
    styles: { font: defaultFont, fontSize: 6.5, cellPadding: 2, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.1, overflow: 'linebreak' },
    headStyles: { font: defaultFont, fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', fontSize: 6.5 },
    head: [['#', 'TIME', 'CUSTOMER', 'ADDRESS', 'PHONE', 'QTY', 'LION COLORS', 'CAI QING', 'DETAILS', 'QUOTE', 'ACTUAL', 'PAY', 'DURATION', 'STATUS', 'REMARKS']],
    body: itinRows.length > 0 ? itinRows : [['', '', 'No stops scheduled', '', '', '', '', '', '', '', '', '', '', '', '']],
    foot: itinRows.length > 0 ? [['', '', '', '', '', '', '', '', 'TOTAL', `RM${totalQuote}`, `RM${totalActual}`, '', '', '', '']] : [],
    footStyles: { fillColor: [245, 245, 245], fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0:  { halign: 'center' },
      1:  { halign: 'center' },
      5:  { halign: 'center' },
      9:  { halign: 'right' },
      10: { halign: 'right' },
      11: { halign: 'center' },
      12: { halign: 'center' },
      13: { halign: 'center' }
    },
    didDrawPage: () => {
      drawWatermarkAndFooter(doc, logoImg, trackedPages)
    }
  })

  const fileName = `DayReport_${meta.dateKey}_${(meta.troupeName || 'All').replace(/\s/g, '_')}.pdf`
  doc.save(fileName)
}

export const exportDayReportExcel = async (stops, members, attendanceDetails, meta, checkIns = []) => {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()

  const sortedMembers = [...members].sort((a, b) => (a.displayname || '').localeCompare(b.displayname || ''))

  // Sheet 1: Roster
  const rosterData = [
    [`DAILY REPORT — ${meta.dayLabel || meta.dateKey} — ${meta.troupeName || 'All Teams'}`],
    [],
    ['#', 'NAME', 'CHECK IN', 'CHECK OUT', 'DURATION'],
    ...sortedMembers.map((m, i) => {
      const memberCheckIn = (checkIns || []).find(c => c.member_id === m.id)
      const checkInStr = memberCheckIn ? formatTimeOnly(memberCheckIn.check_in_at) : '-'
      const checkOutStr = memberCheckIn ? (memberCheckIn.check_out_at ? formatTimeOnly(memberCheckIn.check_out_at) : 'ACTIVE') : '-'
      const durationStr = memberCheckIn ? calcCheckInDuration(memberCheckIn.check_in_at, memberCheckIn.check_out_at) : '-'

      return [
        i + 1,
        m.displayname || '-',
        checkInStr,
        checkOutStr,
        durationStr
      ]
    })
  ]
  const wsRoster = XLSX.utils.aoa_to_sheet(rosterData)
  wsRoster['!cols'] = [{ wch: 5 }, { wch: 35 }, { wch: 18 }, { wch: 18 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(wb, wsRoster, 'Roster')

  // Sheet 2: Itinerary
  const itinData = [
    [`ITINERARY — ${meta.dayLabel || meta.dateKey} — ${meta.troupeName || 'All Teams'}`],
    [],
    ['#', 'TIME', 'CUSTOMER', 'ADDRESS', 'PHONE', 'LION QTY', 'LION COLORS', 'CAI QING (采青)', 'DETAILS', 'QUOTE (RM)', 'ACTUAL (RM)', 'PAYMENT', 'EST. DURATION', 'PERF. DURATION', 'STATUS', 'REMARKS'],
    ...stops.map((s, i) => [
      i + 1,
      s.scheduledtime || '-',
      s.householdname || '-',
      s.address || '-',
      s.phone || '-',
      s.lionquantity || '-',
      formatColorsExcel(s.lioncolor),
      formatPluckingExcel(s.pluckingtype),
      buildPerformanceDetails(s),
      Number(s.amount) || 0,
      s.status === 'completed' ? (Number(s.actualamount) || Number(s.amount) || 0) : '-',
      s.status === 'completed' ? (s.paymentmethod || 'Cash') : '-',
      `${s.duration || 30}m`,
      calcDuration(s),
      (s.status || 'pending').toUpperCase(),
      s.remarks || '-'
    ])
  ]

  const totalQuote = stops.reduce((sum, s) => sum + (Number(s.amount) || 0), 0)
  const totalActual = stops.filter(s => s.status === 'completed').reduce((sum, s) => sum + (Number(s.actualamount) || Number(s.amount) || 0), 0)

  itinData.push([])
  itinData.push(['', '', '', '', '', '', '', '', 'TOTAL', totalQuote, totalActual, '', '', '', '', ''])

  const wsItin = XLSX.utils.aoa_to_sheet(itinData)
  wsItin['!cols'] = [
    { wch: 5 }, { wch: 12 }, { wch: 22 }, { wch: 35 }, { wch: 18 }, { wch: 8 },
    { wch: 25 }, { wch: 28 }, { wch: 20 }, { wch: 12 }, { wch: 12 },
    { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 25 }
  ]
  XLSX.utils.book_append_sheet(wb, wsItin, 'Itinerary')

  const fileName = `DayReport_${meta.dateKey}_${(meta.troupeName || 'All').replace(/\s/g, '_')}.xlsx`
  XLSX.writeFile(wb, fileName)
}

// ─────────────────────────────────────────────────────────────
// FINANCE EXPORT
// ─────────────────────────────────────────────────────────────

export const exportFinancePDF = async (transactions, periodStats, settings, meta) => {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const doc = new jsPDF()

  // Load and add Chinese font to prevent garbled content in reports
  const fontBase64 = await loadChineseFont()
  if (fontBase64) {
    doc.addFileToVFS('NotoSansSC.ttf', fontBase64)
    doc.addFont('NotoSansSC.ttf', 'NotoSansSC', 'normal')
    doc.addFont('NotoSansSC.ttf', 'NotoSansSC', 'bold')
  }
  const defaultFont = fontBase64 ? 'NotoSansSC' : 'helvetica'

  const title = `Finance Report — ${meta.periodLabel || 'All Time'}`
  const logoUrl = settings?.clublogo || null
  const logoImg = logoUrl ? await preloadImage(logoUrl) : null
  const trackedPages = new Set()
  
  // First page watermark & footer
  drawWatermarkAndFooter(doc, logoImg, trackedPages)

  const startY = await addClubHeader(doc, settings, title, defaultFont)

  // Sort ascending for running balance
  const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date))
  
  let runningBalance = 0
  const rows = sorted.map((t, i) => {
    const amount = Number(t.amount) || 0
    const isDebit = t.type === 'income' || t.type === 'sponsorship'
    if (isDebit) runningBalance += amount
    else runningBalance -= amount

    return [
      i + 1,
      new Date(t.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      t.category || '-',
      t.description || '-',
      t.paymentmethod || 'Cash',
      isDebit ? `RM ${amount.toFixed(2)}` : '-',
      !isDebit ? `RM ${amount.toFixed(2)}` : '-',
      `RM ${runningBalance.toFixed(2)}`
    ]
  })

  autoTable(doc, {
    startY: startY + 2,
    theme: 'grid',
    styles: { font: defaultFont, fontSize: 7, cellPadding: 2, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.1 },
    headStyles: { font: defaultFont, fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
    head: [['#', 'DATE', 'CATEGORY', 'DESCRIPTION', 'METHOD', 'DEBIT (RM)', 'CREDIT (RM)', 'BALANCE (RM)']],
    body: rows.length > 0 ? rows : [['', '', '', 'No transactions found', '', '', '', '']],
    foot: rows.length > 0 ? [
      ['', '', '', '', '', 'INCOME', `+ RM ${periodStats.totalIncome.toFixed(2)}`, ''],
      ['', '', '', '', '', 'SPONSORSHIP', `+ RM ${(periodStats.totalSponsorship || 0).toFixed(2)}`, ''],
      ['', '', '', '', '', 'EXPENSES', `- RM ${periodStats.totalExpenses.toFixed(2)}`, ''],
      ['', '', '', '', '', 'TOTAL BALANCE', `= RM ${periodStats.balance.toFixed(2)}`, '']
    ] : [],
    footStyles: { font: defaultFont, fillColor: [245, 245, 245], fontStyle: 'bold', halign: 'right', fontSize: 7 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { cellWidth: 22 },
      2: { cellWidth: 22 },
      3: { cellWidth: 40 },
      4: { halign: 'center', cellWidth: 20 },
      5: { halign: 'right', cellWidth: 22 },
      6: { halign: 'right', cellWidth: 22 },
      7: { halign: 'right', cellWidth: 24 }
    },
    didDrawPage: () => {
      drawWatermarkAndFooter(doc, logoImg, trackedPages)
    }
  })

  const fileName = `Finance_${(meta.periodLabel || 'AllTime').replace(/\s/g, '_')}.pdf`
  doc.save(fileName)
}

export const exportFinanceExcel = async (transactions, periodStats, meta) => {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()

  // Sort ascending for running balance
  const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date))
  
  let runningBalance = 0
  const rows = sorted.map((t, i) => {
    const amount = Number(t.amount) || 0
    const isDebit = t.type === 'income' || t.type === 'sponsorship'
    if (isDebit) runningBalance += amount
    else runningBalance -= amount

    return [
      i + 1,
      new Date(t.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      t.category || '-',
      t.description || '-',
      t.paymentmethod || 'Cash',
      isDebit ? amount : 0,
      !isDebit ? amount : 0,
      runningBalance
    ]
  })

  const data = [
    [`FINANCE REPORT — ${meta.periodLabel || 'All Time'}`],
    [],
    ['#', 'DATE', 'CATEGORY', 'DESCRIPTION', 'PAYMENT METHOD', 'DEBIT (RM)', 'CREDIT (RM)', 'BALANCE (RM)'],
    ...rows,
    [],
    ['', '', '', '', '', 'TOTAL INCOME', periodStats.totalIncome, ''],
    ['', '', '', '', '', 'TOTAL SPONSORSHIP', periodStats.totalSponsorship || 0, ''],
    ['', '', '', '', '', 'TOTAL EXPENSES', periodStats.totalExpenses, ''],
    ['', '', '', '', '', 'TOTAL BALANCE', periodStats.balance, '']
  ]

  const ws = XLSX.utils.aoa_to_sheet(data)
  ws['!cols'] = [
    { wch: 5 }, { wch: 18 }, { wch: 18 }, { wch: 35 }, { wch: 18 }, 
    { wch: 14 }, { wch: 14 }, { wch: 16 }
  ]
  XLSX.utils.book_append_sheet(wb, ws, 'Finance')

  const fileName = `Finance_${(meta.periodLabel || 'AllTime').replace(/\s/g, '_')}.xlsx`
  XLSX.writeFile(wb, fileName)
}

export const exportSalaryReportPDF = async (salaries, rateMode, dateRange, settings) => {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const doc = new jsPDF({ orientation: 'portrait' })
  
  // Load and add Chinese font
  const fontBase64 = await loadChineseFont()
  if (fontBase64) {
    doc.addFileToVFS('NotoSansSC.ttf', fontBase64)
    doc.addFont('NotoSansSC.ttf', 'NotoSansSC', 'normal')
    doc.addFont('NotoSansSC.ttf', 'NotoSansSC', 'bold') // fallback mapping
  }
  const defaultFont = fontBase64 ? 'NotoSansSC' : 'helvetica'

  const title = `SALARY REPORT (${rateMode.toUpperCase()} BASIS)`
  const logoUrl = settings?.clublogo || null
  const logoImg = logoUrl ? await preloadImage(logoUrl) : null
  const trackedPages = new Set()

  // Watermark
  drawWatermarkAndFooter(doc, logoImg, trackedPages)

  // Header
  const startY = await addClubHeader(doc, settings, title, defaultFont)

  // Period / Subtitle
  doc.setFont(defaultFont, 'normal')
  doc.setFontSize(9)
  doc.text(`Period: ${dateRange.startDate} to ${dateRange.endDate}`, 15, startY)

  // Summary Metrics Section
  let totalPayout = 0
  let totalHours = 0
  let totalDays = 0
  let totalBonus = 0
  let totalDeduction = 0
  salaries.forEach(s => {
    totalPayout += s.totalPay
    totalHours += s.hoursWorked
    totalDays += s.daysWorked
    totalBonus += s.bonus
    totalDeduction += s.deduction
  })

  doc.setFont(defaultFont, 'bold')
  doc.text(`SUMMARY:`, 15, startY + 8)
  doc.setFont(defaultFont, 'normal')
  doc.text(`Total Payout: RM ${totalPayout.toFixed(2)}  |  Total Hours: ${totalHours.toFixed(1)} hrs  |  Total Days Worked: ${totalDays} sessions`, 15, startY + 13)

  // Table rows
  const tableRows = salaries.map((s, idx) => [
    idx + 1,
    s.member.displayname || s.member.displayName || '-',
    (s.member.role || 'member').toUpperCase(),
    s.daysWorked,
    s.hoursWorked.toFixed(1),
    `RM ${s.rate}`,
    `RM ${s.bonus}`,
    `RM ${s.deduction}`,
    `RM ${s.totalPay.toFixed(2)}`
  ])

  autoTable(doc, {
    startY: startY + 18,
    theme: 'grid',
    styles: { font: defaultFont, fontSize: 8, cellPadding: 3, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.1 },
    headStyles: { font: defaultFont, fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
    head: [['#', 'NAME', 'ROLE', 'DAYS', 'HOURS', 'RATE', 'BONUS', 'DEDUCT', 'NET PAY']],
    body: tableRows.length > 0 ? tableRows : [['', 'No personnel found', '', '', '', '', '', '', '']],
    foot: [['', '', 'TOTAL', '', '', '', `RM ${totalBonus.toFixed(2)}`, `RM ${totalDeduction.toFixed(2)}`, `RM ${totalPayout.toFixed(2)}`]],
    footStyles: { font: defaultFont, fillColor: [245, 245, 245], fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'center' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right' },
      8: { halign: 'right', fontStyle: 'bold' }
    },
    didDrawPage: () => {
      drawWatermarkAndFooter(doc, logoImg, trackedPages)
    }
  })

  doc.save(`SalaryReport_${dateRange.startDate}_to_${dateRange.endDate}.pdf`)
}
