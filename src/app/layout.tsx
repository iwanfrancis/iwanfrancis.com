import type { Metadata } from 'next'
import { Geist, Josefin_Sans } from 'next/font/google'
import '@/globals.css'
import { cn } from '@/utils/cn'
import AppProvider from './provider'

export const metadata: Metadata = {
  title: 'Iwan Francis',
  icons: {
    icon: '/logos/if.svg',
  },
}

const fontGeist = Geist({ subsets: ['latin'], variable: '--font-geist' })
const fontJosefin = Josefin_Sans({
  subsets: ['latin'],
  variable: '--font-josefin',
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body
        className={cn(fontGeist.className, fontJosefin.variable, 'font-geist')}
      >
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  )
}
