import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { supabase } from '../supabase'
import { loadChineseFont } from './exportUtils'

export const formatPerformanceDescription = (stop) => {
  const lQty = stop.lionquantity || 2
  const lionText = `${lQty} LION${lQty > 1 ? 'S' : ''}`
  
  const colorMap = {
    '黄': 'YELLOW', '黄红': 'YELLOW-RED', '红': 'RED', '黑': 'BLACK', '紫': 'PURPLE',
    '橙': 'ORANGE', '青': 'GREEN', '白': 'WHITE', '金': 'GOLD', '银': 'SILVER'
  }
  const pluckingMap = {
    '五福临门': 'FIVE BLESSINGS (WU FU LIN MEN)',
    '步步高升': 'STEP BY STEP PROSPERITY (BU BU GAO SHENG)',
    '招财进宝': 'BRINGING IN WEALTH (ZHAO CAI JIN BAO)',
    '满地黄金': 'GROUND COVERED IN GOLD (MAN DI HUANG JIN)',
    '车青': 'CAR BLESSING (CHE QING)',
    '地主': 'EARTH GOD BLESSING (DI ZHU)'
  }
  
  let lines = [`CNY LION DANCE PERFORMANCE - ${lionText}`]
  if (stop.lioncolor) {
    const colors = (Array.isArray(stop.lioncolor) ? stop.lioncolor : [stop.lioncolor])
      .map(c => colorMap[c] || c.toUpperCase())
    lines.push(`COLOR: ${colors.join(', ')}`)
  }

  if (stop.hasgodofwealth) lines.push(`+ GOD OF WEALTH`)
  if (stop.hasbigheadbuddha) lines.push(`+ BIG HEAD BUDDHA`)
  
  if (stop.pluckingtype) {
    const types = (Array.isArray(stop.pluckingtype) ? stop.pluckingtype : [stop.pluckingtype])
      .map(t => pluckingMap[t] || t.toUpperCase())
    lines.push(`+ PLUCKING: ${types.join(', ')}`)
  }

  return lines.join('\n')
}

export const generateBillingPDF = async (data, settings, userProfile, type = 'INVOICE') => {
  // 1. Initialize A4 Document
  const doc = new jsPDF()
  
  // Set up fonts
  doc.setFont("helvetica")
  
  // Configuration Overrides
  const clubNameEn = settings?.clubnameen || "Persatuan Tarian Singa Dan Naga Chuan Cheng Melaka"
  const clubNameCn = settings?.clubnamecn || "馬來西亞馬六甲傳承龍獅體育會"
  const clubRegNo = settings?.clubregistrationno || "(PPM-015-04-30122019)"
  const clubAddress = settings?.clubaddress || "NO 23-1, JALAN IMJ 2, TAMAN INDUSTRI MALIM JAYA, 75250, MELAKA"
  const clubPhone = settings?.clubphone || "012-328 2862 / 013-666 0979"
  const prepName = settings?.receiptpreparedby || userProfile?.displayname || "ADMIN"
  const bankName = settings?.bankname || "PERSATUAN TARIAN NAGA DAN SINGA CHUAN CHENG MELAKA"
  const bankType = settings?.banktype || "CIMB"
  const bankNumber = settings?.banknumber || "8011396083"

  // Load and add Chinese font
  const fontBase64 = await loadChineseFont()
  if (fontBase64) {
    doc.addFileToVFS('NotoSansSC.ttf', fontBase64)
    doc.addFont('NotoSansSC.ttf', 'NotoSansSC', 'normal')
    doc.addFont('NotoSansSC.ttf', 'NotoSansSC', 'bold')
  }
  const defaultFont = fontBase64 ? 'NotoSansSC' : 'helvetica'
  
  const logoUrl = '/logo1.jpeg' 
  
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

  // Watermark
  await addImageToPdf(logoUrl, 30, 80, 150, 150, 0.12)

  // Header Section
  await addImageToPdf(logoUrl, 15, 15, 30, 30)
  
  doc.setFontSize(14)
  doc.setFont(defaultFont, "bold")
  
  const splitClubName = doc.splitTextToSize(clubNameEn.toUpperCase(), 120)
  doc.text(splitClubName, 105, 18, { align: "center" })
  
  const chineseImgY = 18 + (splitClubName.length * 7) + 2
  doc.text(clubNameCn, 105, chineseImgY, { align: "center" })

  doc.setFontSize(9)
  doc.setFont(defaultFont, "normal")
  doc.text(clubRegNo, 105, chineseImgY + 8, { align: "center" })

  const headerAddrY = chineseImgY + 15
  const splitAddr = doc.splitTextToSize(clubAddress.toUpperCase(), 140)
  doc.text(splitAddr, 105, headerAddrY, { align: "center" })
  
  const headerPhoneY = headerAddrY + (splitAddr.length * 5)
  doc.text(`HP: ${clubPhone}`, 105, headerPhoneY, { align: "center" })

  // Billing Details
  const customerName = data.customername || "Customer Name"
  const customerAddress = data.customeraddress || "Address omitted"
  const customerPhone = data.customerphone || "N/A"
  const amount = data.amount || 0
  const qty = data.quantity || 1
  const docId = data.id || Math.random().toString(36).substr(2, 9).toUpperCase()
  const dateStr = data.performancedate || new Date().toISOString().split('T')[0]

  let billingY = headerPhoneY + 12
  
  if (type.toUpperCase() === 'INVOICE') {
    doc.setFontSize(22)
    doc.setFont(defaultFont, "bold")
    doc.text("INVOICE", 105, headerPhoneY + 14, { align: "center" })
    billingY = headerPhoneY + 28
  }

  doc.setFontSize(10)
  doc.setFont(defaultFont, "bold")
  doc.text("TO :", 15, billingY)
  doc.line(15, billingY + 1, 23, billingY + 1) 
  
  doc.text(String(customerName), 15, billingY + 6)
  
  doc.setFont(defaultFont, "normal")
  const splitCustomerAddress = doc.splitTextToSize(String(customerAddress), 80)
  doc.text(splitCustomerAddress, 15, billingY + 12)
  
  doc.setFont(defaultFont, "bold")
  doc.text("PHONE :", 15, billingY + 30)
  doc.line(15, billingY + 31, 25, billingY + 31)
  doc.setFont(defaultFont, "normal")
  doc.text(String(customerPhone), 30, billingY + 30)
  
  doc.setFont(defaultFont, "normal")
  const typePrefix = type.toUpperCase() === 'INVOICE' ? 'INV' : 'QUO'
  doc.text(`${typePrefix} NO :`, 15, billingY + 40)
  doc.line(15, billingY + 41, 29, billingY + 41)
  doc.text(`${typePrefix}-${docId.slice(0, 6).toUpperCase()}`, 35, billingY + 40)

  // Right Side - PREPARED BY
  doc.setFont(defaultFont, "bold")
  doc.text("PREPARED", 120, billingY - 4)
  doc.text("BY :", 120, billingY)
  doc.line(120, billingY + 1, 127, billingY + 1)
  
  doc.setFont(defaultFont, "normal")
  doc.text(prepName.toUpperCase(), 120, billingY + 6)
  
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
  const sigPhone = settings?.signatoryphone || clubPhone.split('/')[0].trim()
  doc.text(sigPhone.replace(/\s/g, ''), 140, phoneLabelY)

  // Items Table
  const displayDate = new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  const descriptionText = `${data.description || 'Lion Dance Performance'}\n\nDATE : ${displayDate}`

  autoTable(doc, {
    startY: billingY + 52,
    theme: 'grid',
    styles: { 
      fillColor: false, 
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
      fontSize: 9
    },
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      1: { cellWidth: 73 },
      2: { halign: 'center', cellWidth: 20 },
      3: { halign: 'center', cellWidth: 25 },
      4: { halign: 'center', cellWidth: 12 },
      5: { halign: 'center', cellWidth: 12 },
      6: { halign: 'center', cellWidth: 25 },
    },
    head: [['ITEM', 'ITEM DESCRIPTION', 'QTY', 'UNIT PRICE\n(RM)', 'DISC', 'TAX', 'AMOUNT\n(RM)']],
    body: [
      [
        '1',
        descriptionText,
        qty,
        Number(amount).toFixed(2),
        '-',
        '-',
        Number(amount).toFixed(2)
      ]
    ],
    foot: [
      ['', '', '', '', '', 'TOTAL (RM)', Number(amount).toFixed(2)]
    ],
    footStyles: { fillColor: false, textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' }
  })
  
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

  // Fine Print (T&C)
  doc.setFontSize(7)
  doc.setFont("helvetica", "bold")
  doc.text("* ORIGINAL RECEIPT MUST BE PRESENTED FOR ANY REPLACEMENT OR EXCHANGE.", 15, finalY + 45)
  doc.text("* GOODS SOLD ARE NOT RETURNABLE & REFUNDABLE.", 15, finalY + 50)
  doc.text("* 50% OF DEPOSIT BEFORE THE PERFORMANCE AND IS NOT REFUNDABLE.", 15, finalY + 55)

  // Export
  const fileName = `${type}_LionDance_${String(customerName).replace(/[^a-z0-9]/gi, '_')}.pdf`
  
  // Audit log
  try {
    if (userProfile?.uid) {
      await supabase.from('billing_docs').insert({
        type,
        customername: customerName,
        amount: Number(amount),
        performancedate: dateStr,
        generatedby: userProfile.uid,
        createdat: new Date().toISOString()
      })
    }
  } catch(e) { console.warn('Failed to audit log billing export', e) }
  
  doc.save(fileName)
  return true
}
