/**
 * Copy research/daily-cases.json → src/data/daily-cases.json for the app bundle.
 * No-ops (exit 0) when the research source is missing so Vercel builds that
 * only have the app dir can use the committed copy.
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const appRoot = join(__dirname, '..')
const source = join(appRoot, '..', 'research', 'daily-cases.json')
const destDir = join(appRoot, 'src', 'data')
const dest = join(destDir, 'daily-cases.json')

if (!existsSync(source)) {
  console.log('[sync:cases] research source missing — using committed src/data/daily-cases.json')
  process.exit(0)
}

mkdirSync(destDir, { recursive: true })
copyFileSync(source, dest)
console.log(`[sync:cases] copied ${source} → ${dest}`)
