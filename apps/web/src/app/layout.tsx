import type { Metadata } from 'next'
import { Inter, Fraunces } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'AI Review  Code review by consensus',
  description:
    'AI Review runs every pull request past a panel of AI models that debate the change and only surface findings the panel agrees on.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable}`}
      style={{ colorScheme: 'dark' }}
    >
      <body className="bg-background font-sans text-foreground antialiased">
        <div className="grain-overlay" />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
