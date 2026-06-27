import MatrixBackground from '@/components/layout/matrix-background/matrix-background'
import Footer from '@/components/navigation/footer/footer'
import Header from '@/components/navigation/header/header'
import ThemeToggleButton from '@/features/theme/components/theme-toggle-button'

/**
 * The standard site shell: header, the ambient matrix background wrapping the
 * page content in normal document flow, and the footer. The full-bleed canvas
 * routes use their own shell, so this lives in a route group rather than the
 * root layout.
 */
export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="relative flex flex-col min-h-screen">
      <Header actions={<ThemeToggleButton />} />
      <MatrixBackground className="grow">{children}</MatrixBackground>
      <Footer actions={<ThemeToggleButton />} />
    </div>
  )
}
