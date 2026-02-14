import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { parse } from 'csv-parse/sync'

const WORKSPACE_ROOT = path.resolve('../')
const CSV_PATH = path.join(WORKSPACE_ROOT, 'Brickset-mySets-owned.csv')
const OUTPUT_DIR = path.resolve('./public')
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'sets.json')

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

;(async () => {
  const csvRaw = await readFile(CSV_PATH, 'utf8')
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
