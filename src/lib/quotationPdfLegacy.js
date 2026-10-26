// PDF layout used for quotations created before the SEAQT numbering (refs like SEA/QT/20260722/001).
// Kept unchanged so those quotations still print with the figures they were issued with.
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format, parseISO } from 'date-fns'
import { supabase } from './supabase'

const TERMS = [
  '75% of survey package deposit is required before work commences.',
  'Remaining balance is payable after survey but before report delivery.',
  'Final reports delivered as PDF.',
  'Quotation valid for 2 weeks from date of issue.',
  'Prices are in USD. EcoCash / Bank transfer accepted.',
]

const loadImg = (src) => new Promise((resolve) => {
  const img = new Image(); img.crossOrigin = 'anonymous'
  img.onload = () => {
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
    c.getContext('2d').drawImage(img, 0, 0)
    resolve(c.toDataURL('image/png'))
  }
  img.onerror = () => resolve(null)
  img.src = src
})

export async function downloadLegacyQuotationPdf(q) {
  const doc = new jsPDF()
  const logoData = await loadImg(`${import.meta.env.BASE_URL}logo.png`)
  let sigData = null
  if (q.signed_by) {
    const { data: signerProfile } = await supabase.from('admin_profiles').select('signature_url').eq('id', q.signed_by).single()
    if (signerProfile?.signature_url) sigData = await loadImg(signerProfile.signature_url)
  }
  const services = typeof q.services === 'string' ? JSON.parse(q.services) : q.services || []
  const transport = typeof q.transport_data === 'string' ? JSON.parse(q.transport_data) : q.transport_data || {}
  const soil = typeof q.soil_data === 'string' ? JSON.parse(q.soil_data) : q.soil_data || {}

  const W = 210, L = 14, R = 196
  const NAVY = [26, 45, 66], ORANGE = [217, 119, 70]
  const LIGHT = [247, 248, 250], MID = [232, 236, 240]
  const MUTED = [100, 116, 139], WHITE = [255, 255, 255]

  // ═══ HEADER ══════════════════════════════════════════════════════
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, W, 46, 'F')
  doc.setFillColor(...ORANGE)
  doc.rect(0, 0, 5, 46, 'F')
  if (logoData) doc.addImage(logoData, 'PNG', 12, 7, 26, 26)
  doc.setTextColor(...WHITE)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('SPATIAL EDGE ANALYTICS', 44, 18)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(190, 205, 220)
  doc.text('Pvt Ltd  ·  Geospatial Consulting', 44, 25)
  doc.setTextColor(...ORANGE)
  doc.setFontSize(7.5)
  doc.text('INNOVATION THROUGH LOCATION  |  📍', 44, 32)
  doc.setTextColor(...WHITE)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(26)
  doc.text('QUOTATION', R, 28, { align: 'right' })
  doc.setFillColor(...ORANGE)
  doc.rect(116, 31, 80, 1.5, 'F')

  // ═══ ORANGE ACCENT BAR ═══════════════════════════════════════════
  doc.setFillColor(...ORANGE)
  doc.rect(0, 46, W, 3, 'F')

  // ═══ META STRIP ══════════════════════════════════════════════════
  doc.setFillColor(...LIGHT)
  doc.rect(L, 53, 182, 15, 'F')
  doc.setFillColor(...ORANGE)
  doc.rect(L, 53, 3, 15, 'F')
  doc.setTextColor(...MUTED)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.text('REFERENCE', 21, 59)
  doc.setFontSize(9.5)
  doc.setTextColor(...NAVY)
  doc.text(q.quotation_ref, 21, 65)
  doc.setFontSize(6.5)
  doc.setTextColor(...MUTED)
  doc.text('DATE ISSUED', 84, 59)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...NAVY)
  doc.text(format(parseISO(q.created_at), 'dd MMMM yyyy'), 84, 65)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(...MUTED)
  doc.text('VALID FOR', 152, 59)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...NAVY)
  doc.text('2 weeks from date of issue', 152, 65)

  // ═══ FROM / TO CARDS ═════════════════════════════════════════════
  doc.setFillColor(245, 247, 250)
  doc.rect(L, 72, 86, 22, 'F')
  doc.setFillColor(...ORANGE)
  doc.rect(L, 72, 3, 22, 'F')
  doc.setTextColor(...ORANGE)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.text('FROM', L + 6, 78)
  doc.setTextColor(...NAVY)
  doc.setFontSize(9.5)
  doc.text('Spatial Edge Analytics Pvt Ltd', L + 6, 84)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  doc.text('admin@sea.co.zw  ·  0780 874 212', L + 6, 89)
  doc.setFillColor(255, 248, 242)
  doc.rect(104, 72, 92, 22, 'F')
  doc.setFillColor(...ORANGE)
  doc.rect(104, 72, 92, 2, 'F')
  doc.setTextColor(...ORANGE)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.text('PREPARED FOR', 108, 79)
  doc.setTextColor(...NAVY)
  doc.setFontSize(9.5)
  doc.text(doc.splitTextToSize(q.client_name || '—', 80)[0], 108, 85)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  let cY = 90
  if (q.client_phone) { doc.text(`Tel: ${q.client_phone}`, 108, cY); cY += 4.5 }
  if (q.farm_location) doc.text(`Location: ${q.farm_location}`, 108, cY)

  // ═══ DESCRIPTION ════════════════════════════════════════════════
  let startY = 99
  if (q.description) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8.5)
    doc.setTextColor(90, 90, 90)
    const descLines = doc.splitTextToSize(q.description, 182)
    doc.text(descLines, L, startY)
    startY += descLines.length * 4.5 + 4
  }

  // Services table
  const rows = []
  services.forEach(s => {
    if (s.description) rows.push([s.description, s.qty || 'Incl.', s.amount ? `$${Number(s.amount).toFixed(2)}` : 'Incl.'])
  })
  rows.push(['Package Subtotal', '', `$${Number(q.pkg_total).toFixed(2)}`])

  if (transport.km) {
    rows.push([`Fuel — ${transport.km} km @ 1L/10km = ${(transport.km / 10).toFixed(0)}L × $${transport.rate}/L`, '1', `$${((transport.km / 10) * transport.rate).toFixed(2)}`])
  }
  if (transport.vehicle) rows.push(['Vehicle Hire', '1', `$${Number(transport.vehicle).toFixed(2)}`])
  if (q.transport_total > 0) rows.push(['Transport Subtotal', '', `$${Number(q.transport_total).toFixed(2)}`])

  if (soil.samples > 0) {
    rows.push([`Soil Sampling — ${soil.samples} samples × $${soil.price}`, soil.samples, `$${(soil.samples * soil.price).toFixed(2)}`])
    rows.push(['Sampling Labour', '1', `$${Number(soil.labour).toFixed(2)}`])
    rows.push(['Soil Services Subtotal', '', `$${Number(q.soil_total).toFixed(2)}`])
  }

  autoTable(doc, {
    startY,
    margin: { left: L, right: L },
    head: [['DESCRIPTION', 'QTY', 'AMOUNT (USD)']],
    body: rows,
    theme: 'plain',
    headStyles: {
      fillColor: NAVY, textColor: WHITE, fontStyle: 'bold', fontSize: 8.5,
      cellPadding: { top: 5, bottom: 5, left: 5, right: 5 },
    },
    bodyStyles: {
      fontSize: 8.5, textColor: [50, 50, 50],
      cellPadding: { top: 3.5, bottom: 3.5, left: 5, right: 5 },
    },
    alternateRowStyles: { fillColor: [249, 250, 252] },
    columnStyles: {
      1: { cellWidth: 22, halign: 'center' },
      2: { cellWidth: 36, halign: 'right' },
    },
    tableLineColor: MID,
    tableLineWidth: 0.25,
    didParseCell: (data) => {
      if (data.row.raw && String(data.row.raw[0]).includes('Subtotal')) {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fillColor = [255, 246, 237]
        data.cell.styles.textColor = NAVY
      }
    },
  })

  // ═══ TOTALS BLOCK ════════════════════════════════════════════════
  const totalsY = doc.lastAutoTable.finalY + 5
  const preVatSubtotal = Number(q.pkg_total || 0) + Number(q.transport_total || 0) + Number(q.soil_total || 0)
  const pdfVat = preVatSubtotal * 0.155

  doc.setFillColor(...LIGHT)
  doc.rect(130, totalsY, 66, 10, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...MUTED)
  doc.text('Subtotal', 134, totalsY + 7)
  doc.setTextColor(...NAVY)
  doc.text(`$${preVatSubtotal.toFixed(2)}`, R, totalsY + 7, { align: 'right' })

  doc.setFillColor(...MID)
  doc.rect(130, totalsY + 10, 66, 10, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...MUTED)
  doc.text('VAT (15.5%)', 134, totalsY + 17)
  doc.setTextColor(...NAVY)
  doc.text(`$${pdfVat.toFixed(2)}`, R, totalsY + 17, { align: 'right' })

  doc.setFillColor(...NAVY)
  doc.rect(130, totalsY + 20, 66, 14, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...WHITE)
  doc.text('GRAND TOTAL (USD)', 134, totalsY + 29)
  doc.setTextColor(...ORANGE)
  doc.setFontSize(12)
  doc.text(`$${Number(q.grand_total).toFixed(2)}`, R, totalsY + 29, { align: 'right' })

  // ═══ TERMS & CONDITIONS ══════════════════════════════════════════
  let termsY = totalsY + 40
  const termsBlockH = TERMS.length * 5.5 + 12
  doc.setFillColor(255, 249, 244)
  doc.rect(L, termsY, 182, termsBlockH, 'F')
  doc.setFillColor(...ORANGE)
  doc.rect(L, termsY, 3, termsBlockH, 'F')
  doc.setTextColor(...NAVY)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('TERMS & CONDITIONS', L + 6, termsY + 7)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(60, 60, 60)
  let tLine = termsY + 13
  TERMS.forEach(t => {
    doc.text(`• ${t}`, L + 6, tLine)
    tLine += 5.5
  })

  // ═══ SIGNATURE ═══════════════════════════════════════════════════
  let sigY = termsY + termsBlockH + 8
  doc.setFillColor(...ORANGE)
  doc.rect(L, sigY, 74, 0.8, 'F')
  doc.setTextColor(...MUTED)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.text('AUTHORISED SIGNATURE', L, sigY + 5)
  if (sigData) {
    doc.addImage(sigData, 'PNG', L, sigY + 7, 50, 18)
    sigY += 25
  } else {
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.4)
    doc.line(L, sigY + 22, L + 72, sigY + 22)
    sigY += 22
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...NAVY)
  if (q.signer_role) {
    doc.text(q.signer_role, L, sigY + 5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...MUTED)
    doc.text('Spatial Edge Analytics Pvt Ltd', L, sigY + 10)
  } else {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...MUTED)
    doc.text('For & on behalf of Spatial Edge Analytics Pvt Ltd', L, sigY + 5)
  }

  // ═══ FOOTER ══════════════════════════════════════════════════════
  doc.setFillColor(...ORANGE)
  doc.rect(0, 284, W, 1.5, 'F')
  doc.setFillColor(...NAVY)
  doc.rect(0, 285.5, W, 11.5, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(175, 190, 205)
  doc.text('admin@sea.co.zw  ·  +263 780 874 212', L, 292)
  doc.setTextColor(...ORANGE)
  doc.setFont('helvetica', 'bold')
  doc.text('INNOVATION THROUGH LOCATION  |  📍', W / 2, 292, { align: 'center' })
  doc.setTextColor(175, 190, 205)
  doc.setFont('helvetica', 'normal')
  doc.text('Registered in Zimbabwe', R, 292, { align: 'right' })

  doc.save(`Quotation_${q.quotation_ref.replace(/\//g, '-')}.pdf`)
}
