import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const local = new URL('../.local/', import.meta.url)
await mkdir(new URL('harness-home/profiles/web/', local), { recursive: true })
await writeFile(new URL('guardian.patch.json', local), JSON.stringify([{ insert: [{
  id: 'civilization-base-ui',
  name: new URL('../src/index.js', import.meta.url).href,
  config: {},
}] }], null, 2) + '\n')
console.log(`Guardian overlay: ${fileURLToPath(new URL('guardian.patch.json', local))}`)
