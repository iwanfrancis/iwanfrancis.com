import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import '@/globals.css'
import BackgroundHoverEffect from '@/components/misc/background-hover-effect/background-hover-effect'
import Header from '@/features/header/components/header'
import { cn } from '@/utils/cn'

export const metadata: Metadata = {
  title: 'Iwan Francis',
}

const fontGeist = Geist({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={cn(fontGeist.className, 'bg-matrix')}>
        <BackgroundHoverEffect />
        <div className="relative z-50">
          <Header />
          {children}
        </div>
      </body>
    </html>
  )
}
