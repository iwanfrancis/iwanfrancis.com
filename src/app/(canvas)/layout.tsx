import Header from '@/components/navigation/header/header'
import Logo from '@/components/navigation/header/logo'
import { siteConfig } from '@/config/site'
import ThemeToggleButton from '@/features/theme/components/theme-toggle-button'

/**
 * Full-bleed shell for pan-around canvas pages (e.g. /thingies): the header
 * floats over a viewport-filling surface, with no footer and no document scroll.
 * The surface itself paints the background, so this layout stays minimal.
 */
export default function CanvasLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="relative h-dvh overflow-hidden">
      <Header
        logo={<Logo />}
        links={siteConfig.nav}
        actions={<ThemeToggleButton />}
      />
      {children}
    </div>
  )
}
