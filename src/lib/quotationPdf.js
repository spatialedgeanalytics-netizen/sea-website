// Quotation PDF — same layout and maths as quotation_generator.py
//
// Images/fonts are read from public/quotation/:
//   logo.png  (or .jpg/.jpeg)  - left of the header
//   logo2.png (or .jpg/.jpeg)  - right of the header
//   fonts/Aptos.ttf, fonts/Aptos Bold.ttf, fonts/Aptos Italic.ttf  - optional, Helvetica otherwise
//   (aptos.ttf / aptos-bold.ttf / aptos-italic.ttf also work)
// The signature is the signing admin's uploaded signature (My Profile); without one the line is left blank.
import { format } from 'date-fns'
import { supabase } from './supabase'

export const COMPANY = 'Spatial Edge Analytics Pvt Ltd'
export const SHORT_NAME = 'SEA Pvt Ltd'
export const TEL = '0780 874 212'
export const EMAIL = 'spatialedgeanalytics@gmail.com'
export const REF_PREFIX = 'SEAQT'
export const TAX_RATE = 0.15        // 15% tax on services
export const KM_PER_LITRE = 10      // fuel assumption: 1 L = 10 km

// {TRANSPORT} is replaced with the transport (fuel) amount
export const DEFAULT_TERMS = [
  'Full transport fee ({TRANSPORT}) is payable before fieldwork commences.',
  '50% of survey package deposit is required before work commences.',
  'Remaining balance is payable after survey but before report delivery.',
  'Final reports delivered as PDF: maps with explanatory notes.',
  'Quotation valid for 14 days from date of issue.',
  'Prices are in USD. EcoCash / Bank transfer accepted.',
]

const ASSET_DIR = `${import.meta.env.BASE_URL}quotation`

const NAVY = '#1F4E89'
const ORANGE = '#E08A1E'
const LIGHT = '#EEF2F8'
const SUBTOTAL_BG = '#DCE5F1'
const DARK = '#333333'
const GREY = '#666666'
const WHITE = '#FFFFFF'

// ─── Number & money helpers ─────────────────────────────────────────────────
// Round to cents the way people expect (0.005 -> 0.01)
export const r2 = (v) => Math.round(Number((Number(v) * 100).toFixed(8))) / 100

export const money = (v) => '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// 10 -> '10', 240.5 -> '240.5'
export const num = (v) => String(Number(v))

// Accepts 150, 87.50, 87,50, $1,250.00, 240,5 ... returns NaN if it isn't a number >= 0
export function parseNumber(text) {
  let s = String(text ?? '').trim().replace(/\$/g, '').replace(/\s/g, '').replace(/usd/gi, '')
  if (s.includes(',') && s.includes('.')) {          // 1,250.50 -> thousands comma
    s = s.replace(/,/g, '')
  } else if (s.includes(',')) {
    const parts = s.split(',')
    s = parts.length === 2 && parts[1].length !== 3
      ? `${parts[0]}.${parts[1]}`                      // 87,50 / 240,5 -> decimal comma
      : s.replace(/,/g, '')                            // 1,250 -> thousands
  }
  if (s === '' || isNaN(Number(s))) return NaN
  const value = Number(s)
  return value < 0 ? NaN : value
}

export const formatRef = (no, date = new Date()) =>
  `${REF_PREFIX}${format(date, 'yyyyMMdd')}${String(no).padStart(2, '0')}`

// ─── Calculations ───────────────────────────────────────────────────────────
export function calcQuote({ services, distance_km, fuel_rate }) {
  const servicesTotal = r2(services.reduce((s, x) => s + r2((Number(x.qty) || 0) * (Number(x.unit_price) || 0)), 0))
  const tax = r2(servicesTotal * TAX_RATE)
  const subTotal = r2(servicesTotal + tax)
  const litres = (Number(distance_km) || 0) / KM_PER_LITRE
  const fuel = r2(litres * (Number(fuel_rate) || 0))
  return { servicesTotal, tax, subTotal, litres, fuel, grand: r2(subTotal + fuel) }
}

export const fillTerm = (term, fuel) => term.split('{TRANSPORT}').join(money(fuel))

// 'Mutare Area' -> 'the Mutare Area', 'Nyanga' -> 'Nyanga'
function areaPhrase(location) {
  const low = location.toLowerCase()
  if (!low.startsWith('the ') && /\b(area|district|region|province|valley|ward|outskirts)$/.test(low)) {
    return 'the ' + location
  }
  return location
}

export function defaultSummary({ name, farm, hectares, location }) {
  let text = `This quotation is prepared for ${name} for a comprehensive `
    + `GIS and Remote Sensing Survey of a ${num(hectares)}-hectare farm `
    + `in ${areaPhrase(location)}`
  if (farm) text += `, for the farm ${farm}`
  return text + '.'
}

// ─── Assets ─────────────────────────────────────────────────────────────────
const loadImg = (src) => new Promise((resolve) => {
  const img = new Image(); img.crossOrigin = 'anonymous'
  img.onload = () => {
    try {
      const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight
      c.getContext('2d').drawImage(img, 0, 0)
      resolve({ data: c.toDataURL('image/png'), w: img.naturalWidth, h: img.naturalHeight })
    } catch { resolve(null) }
  }
  img.onerror = () => resolve(null)
  img.src = src
})

async function findImage(name) {
  for (const ext of ['png', 'jpg', 'jpeg']) {
    const img = await loadImg(`${ASSET_DIR}/${name}.${ext}`)
    if (img) return img
  }
  return null
}

async function loadSignature(url) {
  if (!url) return null
  const direct = await loadImg(url)
  if (direct) return direct
  // Private bucket: the stored public URL won't serve, so download through the API instead
  const path = url.split('/sea-documents/')[1]
  if (!path) return null
  const { data } = await supabase.storage.from('sea-documents').download(decodeURIComponent(path.split('?')[0]))
  if (!data) return null
  const objectUrl = URL.createObjectURL(data)
  const img = await loadImg(objectUrl)
  URL.revokeObjectURL(objectUrl)
  return img
}

let aptosCache // undefined = not tried yet, null = not available

async function loadAptos() {
  if (aptosCache !== undefined) return aptosCache
  const readOne = async (file) => {
    try {
      const res = await fetch(`${ASSET_DIR}/fonts/${encodeURIComponent(file)}`)
      if (!res.ok) return null
      const buf = new Uint8Array(await res.arrayBuffer())
      // The dev server answers missing files with index.html, so check for a real TrueType header
      const magic = String.fromCharCode(...buf.subarray(0, 4))
      if (magic !== '\0\x01\0\0' && magic !== 'true') return null
      let bin = ''
      for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000))
      return btoa(bin)
    } catch { return null }
  }
  // Accept the Windows names (Aptos Bold.ttf) as well as aptos-bold.ttf; web servers are case-sensitive
  const read = async (style) => {
    const names = style
      ? [`Aptos ${style}.ttf`, `aptos-${style.toLowerCase()}.ttf`, `Aptos-${style}.ttf`, `aptos ${style.toLowerCase()}.ttf`]
      : ['Aptos.ttf', 'aptos.ttf']
    for (const name of names) {
      const font = await readOne(name)
      if (font) return font
    }
    return null
  }
  const [reg, bold, ital] = await Promise.all(['', 'Bold', 'Italic'].map(read))
  aptosCache = reg ? { reg, bold: bold || reg, ital: ital || reg } : null
  return aptosCache
}

// ─── PDF drawing ────────────────────────────────────────────────────────────
// Drawing helpers take reportlab-style coordinates (y measured up from the bottom of the page)
// so the layout below reads the same as the Python script.
class QuotePDF {
  ROW = 15.5

  constructor(doc, q, { logoLeft, logo, sig, fonts }) {
    this.c = doc
    this.W = doc.internal.pageSize.getWidth()
    this.H = doc.internal.pageSize.getHeight()
    this.M = 32
    this.q = q
    this.logoLeft = logoLeft; this.logo = logo; this.sig = sig; this.fonts = fonts
    this.t = calcQuote(q)
    // column positions
    this.amountX = this.W - this.M - 2     // right edge
    this.unitX = this.W - this.M - 100     // right edge
    this.qtyX = this.W - this.M - 190      // centre
  }

  font(kind, size) { this.c.setFont(...this.fonts[kind]); this.c.setFontSize(size) }
  fill(color) { this.c.setFillColor(color); this.c.setTextColor(color) }
  stroke(color, width) { this.c.setDrawColor(color); this.c.setLineWidth(width) }
  rect(x, y, w, h) { this.c.rect(x, this.H - y - h, w, h, 'F') }
  roundRect(x, y, w, h, r) { this.c.roundedRect(x, this.H - y - h, w, h, r, r, 'F') }
  line(x1, y1, x2, y2) { this.c.line(x1, this.H - y1, x2, this.H - y2) }
  text(s, x, y, align) { this.c.text(String(s), x, this.H - y, align ? { align } : undefined) }
  split(s, kind, size, width) { this.font(kind, size); return this.c.splitTextToSize(String(s), width) }

  // Fit the image inside the box keeping its shape; anchor w = left, e = right, c = centre
  image(img, x, y, bw, bh, anchor) {
    const s = Math.min(bw / img.w, bh / img.h), w = img.w * s, h = img.h * s
    const dx = anchor === 'w' ? x : anchor === 'e' ? x + bw - w : x + (bw - w) / 2
    const dy = y + (bh - h) / 2
    this.c.addImage(img.data, 'PNG', dx, this.H - dy - h, w, h)
  }

  // -- page furniture --
  topBar() {
    this.fill(ORANGE)
    this.rect(0, this.H - 7, this.W, 7)
  }

  footer() {
    this.fill(NAVY)
    this.rect(0, 6, this.W, 24)
    this.fill(ORANGE)
    this.rect(0, 0, this.W, 6)
    this.fill(WHITE)
    this.font('reg', 8)
    this.text(`${COMPANY}   ·   ${TEL}   ·   ${EMAIL}`, this.W / 2, 15, 'center')
  }

  need(h) {
    if (this.y - h < 38) {
      this.footer()
      this.c.addPage()
      this.topBar()
      this.y = this.H - 45
    }
  }

  // -- header --
  header() {
    const { W, H, M } = this
    this.topBar()

    // logo (left)  -  company text (centred)  -  logo2 (right)
    const size = 78
    if (this.logoLeft) this.image(this.logoLeft, M, H - 118, size, size, 'w')
    if (this.logo) this.image(this.logo, W - M - size, H - 118, size, size, 'e')

    const cx = W / 2
    this.fill(NAVY)
    this.font('bold', 17)
    this.text(COMPANY, cx, H - 63, 'center')
    this.fill(DARK)
    this.font('reg', 9.5)
    this.text(`Tel: ${TEL}`, cx, H - 81, 'center')
    this.text(`Email: ${EMAIL}`, cx, H - 95, 'center')

    this.stroke(NAVY, 0.8)
    this.line(M, H - 125, W - M, H - 125)
    this.fill(ORANGE)
    this.rect(M, H - 126, 90, 3)

    this.fill(NAVY)
    this.font('bold', 26)
    this.text('QUOTATION', M, H - 160)
    this.fill(DARK)
    this.font('reg', 9)
    this.text(`Reference:  ${this.q.reference}`, M, H - 178)
    this.text(`Date Issued: ${this.q.date_issued}`, M, H - 192)

    // Prepared-for box
    const cl = this.q.client
    const rows = [cl.name]
    if (cl.farm) rows.push(`Farm Name: ${cl.farm}`)
    rows.push(`Farm Location: ${cl.location}`, `Farm Size: ${num(cl.hectares)} Hectares`)
    const bw = 215
    const bx = W - M - bw
    const lines = rows.flatMap(text => this.split(text, 'reg', 9, bw - 22))
    const bh = 26 + 14 * lines.length
    const by = H - 131 - bh
    this.fill(LIGHT)
    this.roundRect(bx, by, bw, bh, 5)
    this.fill(ORANGE)
    this.rect(bx, by, 5, bh)
    this.fill(NAVY)
    this.font('bold', 9)
    let ty = by + bh - 15
    this.text('PREPARED FOR', bx + 15, ty)
    this.fill(DARK)
    this.font('reg', 9)
    for (const ln of lines) {
      ty -= 14
      this.text(ln, bx + 15, ty)
    }

    this.y = Math.min(H - 210, by - 12)

    const summary = (this.q.summary || '').trim()
    if (summary) {
      this.fill(GREY)
      for (const ln of this.split(summary, 'ital', 8.5, W - 2 * M)) {
        this.text(ln, M, this.y)
        this.y -= 11.5
      }
      this.y -= 6
    }
  }

  // -- table pieces --
  tableHeader() {
    const { M, W } = this
    this.need(30)
    this.fill(NAVY)
    this.font('bold', 8.5)
    this.text('SERVICES', M, this.y)
    this.text('QTY', this.qtyX, this.y, 'center')
    this.text('UNIT PRICE', this.unitX, this.y, 'right')
    this.text('AMOUNT (USD)', this.amountX, this.y, 'right')
    this.stroke(NAVY, 0.6)
    this.line(M, this.y - 4, W - M, this.y - 4)
    this.y -= 6
  }

  band(text, fillColor, textColor, { marker = false, right = null, size = 9 } = {}) {
    const { M, W, ROW: R } = this
    this.need(R)
    this.fill(fillColor)
    this.rect(M, this.y - R, W - 2 * M, R)
    if (marker) {
      this.fill(ORANGE)
      this.rect(M, this.y - R, 5, R)
    }
    this.fill(textColor)
    this.font('bold', size)
    this.text(text, M + 15, this.y - R + 5)
    if (right) this.text(right, this.amountX, this.y - R + 5, 'right')
    this.y -= R
  }

  row(desc, { qty = '', unit = '', amount = '', shade = false, bold = false, color = DARK } = {}) {
    const { M, W } = this
    const kind = bold ? 'bold' : 'reg'
    const lines = this.split(desc, kind, 8.5, this.qtyX - 25 - (M + 15))
    const h = Math.max(this.ROW, 11 * lines.length + 5)
    this.need(h + this.ROW)
    if (shade) {
      this.fill(LIGHT)
      this.rect(M, this.y - h, W - 2 * M, h)
    }
    this.font(kind, 8.5)
    this.fill(color)
    let ty = this.y - 11
    for (const ln of lines) {
      this.text(ln, M + 15, ty)
      ty -= 11
    }
    this.fill(GREY)
    this.text(qty, this.qtyX, this.y - 11, 'center')
    this.text(unit, this.unitX, this.y - 11, 'right')
    this.fill(color)
    this.text(amount, this.amountX, this.y - 11, 'right')
    this.y -= h
  }

  tables() {
    const { M, W, t } = this
    this.tableHeader()

    // Services
    this.need(this.ROW * 3)
    this.band('SURVEY PACKAGE', NAVY, WHITE, { marker: true })
    this.q.services.forEach((s, n) => {
      this.row(s.desc, { qty: num(s.qty), unit: money(s.unit_price), amount: money(s.line_total), shade: Boolean(n % 2) })
    })
    this.stroke(SUBTOTAL_BG, 0.8)
    this.line(M, this.y, W - M, this.y)
    this.row('Total', { amount: money(t.servicesTotal), bold: true, color: NAVY })
    this.row(`Tax (${Math.round(TAX_RATE * 100)}%)`, { amount: money(t.tax), bold: true, color: NAVY })
    this.band('SUB TOTAL', SUBTOTAL_BG, NAVY, { right: money(t.subTotal), size: 9 })

    // Transport
    this.need(this.ROW * 3)
    this.band('TRANSPORT', NAVY, WHITE, { marker: true })
    this.row(`Fuel (1 L = ${KM_PER_LITRE} km)`, { amount: money(t.fuel) })
    this.band('Transport Subtotal', SUBTOTAL_BG, NAVY, { right: money(t.fuel), size: 8.5 })

    // Grand total
    this.need(48)
    this.y -= 8
    this.stroke(ORANGE, 1)
    this.line(M, this.y, W - M, this.y)
    const pw = 190
    const px = W - M - pw
    this.fill(NAVY)
    this.roundRect(px, this.y - 32, pw, 26, 5)
    this.fill(WHITE)
    this.font('bold', 12)
    this.text('GRAND TOTAL', px + 12, this.y - 23.5)
    this.text(money(t.grand), px + pw - 10, this.y - 23.5, 'right')
    this.y -= 42
  }

  listBlock(title, items, check) {
    if (!items.length) return
    const { M, W } = this
    this.need(40)
    this.fill(NAVY)
    this.font('bold', 10)
    this.text(title, M, this.y)
    this.fill(ORANGE)
    this.rect(M, this.y - 7, 205, 2)
    this.y -= 18
    for (const text of items) {
      const lines = this.split(text, 'reg', 8.5, W - 2 * M - 22)
      this.need(11.5 * lines.length + 4)
      if (check) {
        this.stroke(NAVY, 1.3)
        this.c.setLineCap('round')
        this.c.setLineJoin('round')
        this.c.lines([[3, 3], [5, -6.5]], M + 4, this.H - (this.y + 3), [1, 1], 'S', false)
      } else {
        this.font('reg', 8.5)
        this.fill(DARK)
        this.text('•', M + 8, this.y)
      }
      this.font('reg', 8.5)
      this.fill(DARK)
      for (const ln of lines) {
        this.text(ln, M + 18, this.y)
        this.y -= 11.5
      }
    }
    this.y -= 6
  }

  signature() {
    const { M } = this
    this.need(90)
    this.fill(NAVY)
    this.font('bold', 9.5)
    this.text('Authorised Signature:', M, this.y)
    if (this.sig) this.image(this.sig, M + 45, this.y - 72, 105, 64, 'c')
    this.stroke(NAVY, 0.6)
    this.line(M, this.y - 76, M + 230, this.y - 76)
    this.fill(DARK)
    this.font('reg', 8.5)
    this.text(`For & on behalf of ${SHORT_NAME}`, M, this.y - 88)
    this.y -= 96
  }

  build() {
    this.header()
    this.tables()
    this.listBlock('FINAL DELIVERABLES (PDF Reports)', this.q.deliverables, true)
    this.listBlock('TERMS & CONDITIONS', this.q.terms, false)
    this.signature()
    this.footer()
  }
}

const parse = (v) => (typeof v === 'string' ? JSON.parse(v) : v)

// Database row -> what the PDF needs
export function rowToQuote(row) {
  const transport = parse(row.transport_data) || {}
  const services = parse(row.services) || []
  const { fuel } = calcQuote({ services, ...transport })
  return {
    reference: row.quotation_ref,
    date_issued: row.date_issued || format(new Date(row.created_at), 'd MMMM yyyy'),
    client: { name: row.client_name, farm: row.farm_name || '', hectares: row.farm_size, location: row.farm_location || '' },
    summary: row.description || '',
    services,
    distance_km: transport.distance_km,
    fuel_rate: transport.fuel_rate,
    deliverables: parse(row.deliverables) || [],
    terms: (parse(row.terms) || []).map(t => fillTerm(t, fuel)),
  }
}

// Builds and downloads the PDF. Returns the list of assets that were missing (for a warning).
export async function downloadQuotationPdf(row, signatureUrl) {
  const q = rowToQuote(row)
  const [logoLeft, logo, sig, aptos] = await Promise.all([
    findImage('logo'), findImage('logo2'), loadSignature(signatureUrl), loadAptos(),
  ])

  const { default: jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  let fonts = { reg: ['helvetica', 'normal'], bold: ['helvetica', 'bold'], ital: ['helvetica', 'italic'] }
  if (aptos) {
    doc.addFileToVFS('Aptos.ttf', aptos.reg); doc.addFont('Aptos.ttf', 'Aptos', 'normal')
    doc.addFileToVFS('Aptos-Bold.ttf', aptos.bold); doc.addFont('Aptos-Bold.ttf', 'Aptos', 'bold')
    doc.addFileToVFS('Aptos-Italic.ttf', aptos.ital); doc.addFont('Aptos-Italic.ttf', 'Aptos', 'italic')
    fonts = { reg: ['Aptos', 'normal'], bold: ['Aptos', 'bold'], ital: ['Aptos', 'italic'] }
  }
  doc.setProperties({ title: `Quotation ${q.reference}`, author: COMPANY })

  new QuotePDF(doc, q, { logoLeft, logo, sig, fonts }).build()

  const safeClient = q.client.name.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  doc.save(`Quotation_${q.reference}_${safeClient}.pdf`)

  const missing = []
  if (!logoLeft) missing.push('public/quotation/logo.png')
  if (!logo) missing.push('public/quotation/logo2.png')
  if (!aptos) missing.push('Aptos font (public/quotation/fonts/) — Helvetica used')
  return missing
}
