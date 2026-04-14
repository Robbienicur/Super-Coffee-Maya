import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Coffe Maya — Admin',
  description: 'Panel de administración del punto de venta Coffe Maya',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
