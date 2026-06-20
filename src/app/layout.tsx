import type { Metadata } from 'next'
import { Geist, Josefin_Sans } from 'next/font/google'
import '@/globals.css'
import MatrixBackground from '@/components/layout/matrix-background/matrix-background'
import Footer from '@/components/navigation/footer/footer'
import Header from '@/components/navigation/header/header'
import { cn } from '@/utils/cn'

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
    <html lang="en" className="scroll-smooth">
      <body
        className={cn(fontGeist.className, fontJosefin.variable, 'font-geist')}
      >
        <div className="relative flex flex-col min-h-screen">
          <Header />
          <MatrixBackground className="flex-grow">{children}</MatrixBackground>
          <Footer />
        </div>
      </body>
    </html>
  )
}
