import { execSync } from 'node:child_process'
import path from 'node:path'

export default async function globalSetup() {
  const repoRoot = path.resolve(__dirname, '../../..')

  console.log('[e2e] reseteando base de datos local...')
  try {
    execSync('pnpm db:reset', {
      cwd: repoRoot,
      stdio: 'inherit',
      timeout: 120_000,
    })
  } catch (err) {
    console.error('[e2e] fallo al resetear BD. Asegúrate de que Docker y Supabase CLI estén corriendo.')
    throw err
  }
}
