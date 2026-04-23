#!/usr/bin/env node
// Copia el preload CJS escrito a mano a out/preload/index.cjs.
// electron-vite emite también index.mjs (bundle ESM) que queda sin usar;
// lo borramos para evitar confusión.
import { copyFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const src = join(root, 'src', 'preload', 'index.cjs')
const outDir = join(root, 'out', 'preload')
const dest = join(outDir, 'index.cjs')
const leftover = join(outDir, 'index.mjs')

mkdirSync(outDir, { recursive: true })
copyFileSync(src, dest)
if (existsSync(leftover)) rmSync(leftover)

console.log('✓ preload CJS copiado a', dest)
