import sharp from 'sharp'
import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join, basename, dirname, extname } from 'path'

const staticDir = './static'

const files = readdirSync(staticDir).filter(f => f.endsWith('.svg'))

for (const file of files) {
  const inputPath = join(staticDir, file)
  const outputPath = join(staticDir, file.replace('.svg', '.png'))

  sharp(inputPath)
    .resize(81, 81)
    .png()
    .toFile(outputPath)
    .then(() => console.log(`✓ ${file} → ${basename(outputPath)}`))
    .catch(err => console.error(`✗ ${file}: ${err.message}`))
}
