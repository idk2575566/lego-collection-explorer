import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { parse } from 'csv-parse/sync'

const OUTPUT_DIR = path.resolve('./public')
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'sets.json')

const SHEET_ID = process.env.TRANSFORMERS_SHEET_ID || process.env.VITE_TRANSFORMERS_SHEET_ID || '1jXpMbJ18-weODPfyR8KIqIYFNcEMIuL8vV5Z8O92I5g'
const SHEET_GID = process.env.VITE_TRANSFORMERS_SHEET_GID || '1360451326'

const toNumber = (value) => {
  if (!value) return null
  const num = Number(String(value).replace(/[^0-9.\-]/g, ''))
  return Number.isFinite(num) ? num : null
}

const fetchSheetCsv = async (sheetId, gid) => {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
  return await res.text()
}

;(async () => {
  const csvRaw = await fetchSheetCsv(SHEET_ID, SHEET_GID)
  const records = parse(csvRaw, {
    columns: true,
    skip_empty_lines: true,
  })

  const sets = records
    .filter((row) => row['Figure'] && row['Image URL'])
    .map((row, idx) => ({
      id: String(idx + 1),
      name: row['Figure'],
      number: row['Release Order'] || '',
      theme: row['Faction'] || 'Unknown',
      faction: row['Faction'] || 'Unknown',
      retailPrice: {
        uk: toNumber(row['RRP / Launch Retail (GBP)'])
      },
      image: row['Image URL'] || null,
      thumb: row['Image URL'] || null,
    }))

  await mkdir(OUTPUT_DIR, { recursive: true })
  await writeFile(OUTPUT_PATH, JSON.stringify(sets, null, 2))
  console.log(`Wrote ${sets.length} transformers to ${OUTPUT_PATH}`)
})().catch((err) => {
  console.error('Failed to build Transformers data:', err.message)
  process.exit(1)
})
