import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { supabase } from '../supabase'
import { loadChineseFont } from './exportUtils'

export const generateAndShareReceipt = async (stop, settings, userProfile) => {
  // 1. Initialize A4 Document
  const doc = new jsPDF()
  
  // Set up fonts
  doc.setFont("helvetica")
  
  // Configuration Overrides
  const clubNameEn = settings?.clubnameen || ""
  const clubNameCn = settings?.clubnamecn || ""
  const clubRegNo = settings?.clubregistrationno || ""
  const clubAddress = settings?.clubaddress || ""
  const clubPhone = settings?.clubphone || ""
  const prepName = settings?.receiptpreparedby || ""
  const bankName = settings?.bankname || ""
  const bankType = settings?.banktype || ""
  const bankNumber = settings?.banknumber || ""

  // Load and add Chinese font
  const fontBase64 = await loadChineseFont()
  if (fontBase64) {
    doc.addFileToVFS('NotoSansSC.ttf', fontBase64)
    doc.addFont('NotoSansSC.ttf', 'NotoSansSC', 'normal')
    doc.addFont('NotoSansSC.ttf', 'NotoSansSC', 'bold')
  }
  const defaultFont = fontBase64 ? 'NotoSansSC' : 'helvetica'
  
  // Logo URL
  const logoUrl = settings?.clublogo || null 
  
  // Helper to add Image to PDF
  const addImageToPdf = (url, x, y, w, h, opacity = 1) => {
    return new Promise((resolve) => {
      const img = new Image()
      img.src = url
      img.onload = () => {
        if (opacity < 1) {
          doc.saveGraphicsState()
          doc.setGState(new doc.GState({ opacity: opacity }))
        }
        doc.addImage(img, 'JPEG', x, y, w, h)
        if (opacity < 1) {
          doc.restoreGraphicsState()
        }
        resolve()
      }
      img.onerror = () => {
        console.warn("Could not load logo image for PDF")
        resolve()
      }
    })
  }

  // ---------------------------------------------------------
  // WATERMARK (Half Transparent)
  // ---------------------------------------------------------
  if (logoUrl) {
    await addImageToPdf(logoUrl, 30, 80, 150, 150, 0.12)
  }

  // ---------------------------------------------------------
  // HEADER SECTION (PRECISE CENTERING)
  // ---------------------------------------------------------
  
  // Logo (Top Left)
  if (logoUrl) {
    await addImageToPdf(logoUrl, 15, 15, 30, 30)
  }
  
  doc.setFontSize(14)
  doc.setFont(defaultFont, "bold")
  
  // English Name
  const splitClubName = doc.splitTextToSize(clubNameEn.toUpperCase(), 120)
  doc.text(splitClubName, 105, 18, { align: "center" })
  
  // Chinese Name
  const chineseImgY = 18 + (splitClubName.length * 7) + 2
  doc.text(clubNameCn, 105, chineseImgY, { align: "center" })

  // Registration No
  doc.setFontSize(9)
  doc.setFont(defaultFont, "normal")
  doc.text(clubRegNo, 105, chineseImgY + 8, { align: "center" })

  // Address
  const headerAddrY = chineseImgY + 15
  const splitAddr = doc.splitTextToSize(clubAddress.toUpperCase(), 140)
  doc.text(splitAddr, 105, headerAddrY, { align: "center" })
  
  // Phone
  const headerPhoneY = headerAddrY + (splitAddr.length * 5)
  doc.text(`HP: ${clubPhone}`, 105, headerPhoneY, { align: "center" })

  // ---------------------------------------------------------
  // BILLING DETAILS (To / Prepared By)
  // ---------------------------------------------------------
  
  const stripTrailingNotes = (str) => {
    let s = String(str || "").trim();
    if (!s.endsWith(')') && !s.endsWith('）')) return s;

    let balance = 0;
    for (let i = s.length - 1; i >= 0; i--) {
      const char = s[i];
      if (char === ')' || char === '）') balance++;
      else if (char === '(' || char === '（') {
        balance--;
        if (balance === 0) {
    const cleaned = s.substring(0, i).trim();
          // Also remove address separator " — " if present
          return cleaned.split(' — ')[0].trim();
        }
      }
    }
    return s.split(' — ')[0].trim();
  }
  const houseName = stripTrailingNotes(stop.householdname || stop.name || "Customer Name")
  const safeAddress = stripTrailingNotes(stop.address || "Address omitted")
  const safePhone = stop.phone || "N/A"
  const safeAmount = (stop.actualamount !== undefined && stop.actualamount !== null)
    ? String(stop.actualamount)
    : (stop.amount ? String(stop.amount) : "0")

  const billingY = headerPhoneY + 12

  doc.setFontSize(10)
  doc.setFont(defaultFont, "bold")
  doc.text("TO :", 15, billingY)
  doc.line(15, billingY + 1, 23, billingY + 1) 
  
  doc.text(String(houseName), 15, billingY + 6)
  
  doc.setFont(defaultFont, "normal")
  const splitCustomerAddress = doc.splitTextToSize(String(safeAddress), 80)
  doc.text(splitCustomerAddress, 15, billingY + 12)
  
  doc.setFont(defaultFont, "bold")
  doc.text("PHONE :", 15, billingY + 30)
  doc.line(15, billingY + 31, 25, billingY + 31)
  doc.setFont(defaultFont, "normal")
  doc.text(String(safePhone), 30, billingY + 30)
  
  doc.setFont(defaultFont, "normal")
  doc.text("INV NO :", 15, billingY + 40)
  doc.line(15, billingY + 41, 29, billingY + 41)
  doc.text(`INV-${String(stop.id).slice(0, 6).toUpperCase()}`, 35, billingY + 40)

  // Right Side - PREPARED BY (MATCHING TARGET EXACTLY)
  doc.setFont(defaultFont, "bold")
  doc.text("PREPARED", 120, billingY - 4)
  doc.text("BY :", 120, billingY)
  doc.line(120, billingY + 1, 127, billingY + 1)
  
  doc.setFont(defaultFont, "normal")
  doc.text(prepName.toUpperCase(), 120, billingY + 6)
  
  // Club Details in Prepared By block
  const splitClubNamePrep = doc.splitTextToSize(clubNameEn.toUpperCase(), 75)
  doc.text(splitClubNamePrep, 120, billingY + 12)
  
  const addrYPrep = billingY + 12 + (splitClubNamePrep.length * 5)
  const splitClubAddrPrep = doc.splitTextToSize(clubAddress.toUpperCase(), 75)
  doc.text(splitClubAddrPrep, 120, addrYPrep)
  
  doc.setFont(defaultFont, "bold")
  const phoneLabelY = addrYPrep + (splitClubAddrPrep.length * 5) + 2
  doc.text("PHONE :", 120, phoneLabelY)
  doc.line(120, phoneLabelY + 1, 135, phoneLabelY + 1)
  doc.setFont(defaultFont, "normal")
  const sigPhone = settings?.signatoryphone || (clubPhone ? clubPhone.split('/')[0].trim() : "")
  doc.text(sigPhone.replace(/\s/g, ''), 140, phoneLabelY)

  // ---------------------------------------------------------
  // ITEMS TABLE
  // ---------------------------------------------------------
  
  const lQty = stop.lionquantity || 2
  const lionText = `${lQty} LION${lQty > 1 ? 'S' : ''}`
  
  const colorMap = {
    '黄': 'YELLOW', '黄红': 'YELLOW-RED', '红': 'RED', '黑': 'BLACK', '紫': 'PURPLE',
    '橙': 'ORANGE', '青': 'GREEN', '白': 'WHITE', '金': 'GOLD', '银': 'SILVER',
    '桃红': 'PINK', '粉': 'PINK', '蓝': 'BLUE', '绿': 'GREEN', '荧光青': 'NEON GREEN'
  }
  const pluckingMap = {
    '五福临门': 'FIVE BLESSINGS (WU FU LIN MEN)',
    '步步高升': 'STEP BY STEP PROSPERITY (BU BU GAO SHENG)',
    '招财进宝': 'BRINGING IN WEALTH (ZHAO CAI JIN BAO)',
    '满地黄金': 'GROUND COVERED IN GOLD (MAN DI HUANG JIN)',
    '车青': 'CAR BLESSING (CHE QING)',
    '地主': 'EARTH GOD BLESSING (DI ZHU)'
  }
  
  let descriptionLines = [`CNY LION DANCE PERFORMANCE - ${lionText}`]
  if (stop.lioncolor) {
    const colors = (Array.isArray(stop.lioncolor) ? stop.lioncolor : [stop.lioncolor])
      .map(c => {
        // If user defined a translation like "粉|PINK", use the English part
        if (typeof c === 'string' && c.includes('|')) {
          return c.split('|')[1].trim().toUpperCase()
        }
        return colorMap[c] || (typeof c === 'string' ? c.toUpperCase() : c)
      })
    descriptionLines.push(`COLOR: ${colors.join(', ')}`)
  }

  if (stop.hasgodofwealth) descriptionLines.push(`+ GOD OF WEALTH`)
  if (stop.hasbigheadbuddha) descriptionLines.push(`+ BIG HEAD BUDDHA`)
  
  if (stop.pluckingtype) {
    const types = (Array.isArray(stop.pluckingtype) ? stop.pluckingtype : [stop.pluckingtype])
      .map(t => pluckingMap[t] || t.toUpperCase())
    descriptionLines.push(`+ PLUCKING: ${types.join(', ')}`)
  }

  descriptionLines.push(``)
  
  let displayDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  if (stop.scheduleddate) {
    const sDate = new Date(stop.scheduleddate)
    if (!isNaN(sDate.getTime())) {
      displayDate = sDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    }
  }
  descriptionLines.push(`DATE : ${displayDate}`)
  
  const descriptionText = descriptionLines.join('\n')

  autoTable(doc, {
    startY: billingY + 52,
    theme: 'grid',
    margin: { left: 15, right: 15 },
    styles: { 
      fillColor: false, 
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
      fontSize: 9,
      font: defaultFont
    },
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      1: { cellWidth: 80 },
      2: { halign: 'center', cellWidth: 15 },
      3: { halign: 'center', cellWidth: 23 },
      4: { halign: 'center', cellWidth: 15 },
      5: { halign: 'center', cellWidth: 15 },
      6: { halign: 'center', cellWidth: 20 },
    },
    head: [['ITEM', 'ITEM DESCRIPTION', 'QTY', 'UNIT PRICE\n(RM)', 'DISC', 'TAX', 'AMOUNT\n(RM)']],
    body: [
      [
        '1',
        String(descriptionText),
        `${lQty} LION${lQty > 1 ? 'S' : ''}`,
        safeAmount,
        '-',
        '-',
        safeAmount
      ]
    ],
    foot: [
      [{ content: 'TOTAL (RM)', colSpan: 6, styles: { halign: 'right' } }, safeAmount]
    ],
    footStyles: { fillColor: false, textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' }
  })
  
  // ---------------------------------------------------------
  // FOOTER BANK DETAILS & SIGNATURE
  // ---------------------------------------------------------
  
  const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : 200
  
  // Bank Details Box
  doc.setDrawColor(0, 0, 0)
  doc.rect(15, finalY, 100, 32) 
  doc.setFontSize(8)
  doc.setFont("helvetica", "bold")
  doc.text("BANK ACCOUNT", 17, finalY + 5)
  
  doc.text("NAME :", 17, finalY + 11)
  const splitBankName = doc.splitTextToSize(bankName.toUpperCase(), 75)
  doc.text(splitBankName, 30, finalY + 11)
  
  const bankTypeY = finalY + 11 + (splitBankName.length * 4) + 1
  doc.text("BANK :", 17, bankTypeY)
  doc.text(bankType.toUpperCase(), 30, bankTypeY)
  
  doc.text(`BANK NUM: ${bankNumber}`, 17, bankTypeY + 5)
  
  // Signature Line
  const signatureLineY = finalY + 24
  doc.setLineWidth(0.5)
  doc.line(130, signatureLineY, 190, signatureLineY)
  doc.setFontSize(8)
  doc.text("CUSTOMER SIGNATURE", 160, signatureLineY + 5, { align: "center" })

  // Fine Print
  doc.setFontSize(7)
  doc.setFont("helvetica", "bold")
  doc.text("* ORIGINAL RECEIPT MUST BE PRESENTED FOR ANY REPLACEMENT OR EXCHANGE.", 15, finalY + 45)
  doc.text("* GOODS SOLD ARE NOT RETURNABLE & REFUNDABLE.", 15, finalY + 50)

  // ---------------------------------------------------------
  // EXPORT & AUDIT LOG
  // ---------------------------------------------------------

  const fileName = `Receipt_LionDance_${String(houseName).replace(/[^a-z0-9]/gi, '_')}.pdf`
  
  // Auditing the export
  try {
    if (userProfile?.uid) {
      await supabase.from('audit_logs').insert({
        actiontype: 'EXPORT_RECEIPT',
        details: { stopid: stop.id, invoice: `INV-${String(stop.id).slice(0, 6).toUpperCase()}` },
        performedby: {
          uid: userProfile.uid,
          name: userProfile.displayname || userProfile.email,
          role: userProfile.role
        },
        timestamp: new Date().toISOString()
      })
    }
  } catch(e) { console.warn('Failed to audit log receipt export', e) }
  
  if (navigator.share && window.isSecureContext) {
    try {
      const pdfBlob = doc.output('blob')
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' })
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Official Performance Receipt',
          text: `Thank you for having us! Attached is the official receipt for your lion dance performance.`,
        })
        return true
      }
    } catch (err) {
      if (err.name !== 'AbortError') console.error("Error sharing via navigator:", err)
    }
  }

  doc.save(fileName)
  return true
}
