import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { parse } from 'csv-parse/sync'
// Use global fetch (Node 18+). Avoid adding node-fetch dependency.

const WORKSPACE_ROOT = path.resolve('../')
const CSV_PATH = path.join(WORKSPACE_ROOT, 'Brickset-mySets-owned.csv')
const OUTPUT_DIR = path.resolve('./public')
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'sets.json')

const SHEET_ID = process.env.TRANSFORMERS_SHEET_ID || process.env.VITE_TRANSFORMERS_SHEET_ID
const SHEET_GID = process.env.VITE_TRANSFORMERS_SHEET_GID || '13501556'

const toNumber = (value) => {
  if (!value) return null
  const num = Number(value.replace(/[^0-9.\-]/g, ''))
  return Number.isFinite(num) ? num : null
}

const toInt = (value) => {
  if (!value) return 0
  const num = parseInt(value, 10)
  return Number.isFinite(num) ? num : 0
}

const fetchSheetCsv = async (sheetId, gid) => {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`
  console.log(`TRANSFORMERS_SHEET_ID set — attempting to fetch public sheet CSV from: ${url}`)
  try {
    const res = await fetch(url, { timeout: 10000 })
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
    return await res.text()
  } catch (err) {
    console.error('Failed to fetch public Google Sheet CSV:', err.message)
    return null
  }
}

;(async () => {
  let csvRaw

  if (SHEET_ID) {
    csvRaw = await fetchSheetCsv(SHEET_ID, SHEET_GID)
    if (!csvRaw) {
      console.warn('Falling back to local Brickset CSV due to fetch error')
    }
  }

  if (!csvRaw) {
    try {
      csvRaw = await readFile(CSV_PATH, 'utf8')
      console.log(`Read local CSV from ${CSV_PATH}`)
    } catch (err) {
      console.error('No CSV available — set TRANSFORMERS_SHEET_ID or ensure local Brickset CSV exists at', CSV_PATH)
      process.exit(1)
    }
  }

  const records = parse(csvRaw, {
    columns: true,
    skip_empty_lines: true,
  })

  const sets = records.map((row) => {
    const minifigs = (row.MinifigNumbers || '')
      .split(',')
      .map((code) => code.trim())
      .filter(Boolean)

    const imageCode = row.ImageFilename || ''
    const buildImageUrl = (sizeFolder) =>
      imageCode ? `https://images.brickset.com/sets/${sizeFolder}/${imageCode}.jpg` : null

    return {
      id: row.SetID,
      name: row.SetName,
      number: row.Number,
      variant: row.Variant,
      theme: row.Theme,
      subtheme: row.Subtheme || null,
      themeGroup: row.ThemeGroup || null,
      category: row.Category || null,
      availability: row.Availability || null,
      packaging: row.PackagingType || null,
      pieces: toInt(row.Pieces),
      minifigsCount: toInt(row.Minifigs),
      minifigs,
      yearFrom: toInt(row.YearFrom),
      retailPrice: {
        us: toNumber(row.USRetailPrice),
        uk: toNumber(row.UKRetailPrice),
        ca: toNumber(row.CARetailPrice),
        de: toNumber(row.DERetailPrice),
      },
      bricklink: {
        new: toNumber(row.BrickLinkSoldPriceNew),
        used: toNumber(row.BrickLinkSoldPriceUsed),
      },
      skus: {
        us: row.USItemNumber || null,
        eu: row.EUItemNumber || null,
        ean: row.EAN || null,
        upc: row.UPC || null,
      },
      dimensions: {
        width: toNumber(row.Width),
        height: toNumber(row.Height),
        depth: toNumber(row.Depth),
        weight: toNumber(row.Weight),
      },
      image: buildImageUrl('images'),
      thumb: buildImageUrl('small'),
    }
  })

  await mkdir(OUTPUT_DIR, { recursive: true })
  await writeFile(OUTPUT_PATH, JSON.stringify(sets, null, 2))
  console.log(`Wrote ${sets.length} sets to ${OUTPUT_PATH}`)
})()
