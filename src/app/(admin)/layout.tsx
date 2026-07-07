import MatrixBackground from '@/components/layout/matrix-background/matrix-background'
import ThemeToggleButton from '@/features/theme/components/theme-toggle-button'

/**
 * Shell for the gated admin surface (login + /artifacts). Unlike the public
 * site it carries no landing navigation — just the ambient background and a
 * theme toggle — so the admin pages read as a separate, focused space. Content
 * is centred within the background.
 */
export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="absolute top-4 right-4 z-30">
        <ThemeToggleButton />
      </div>
      <MatrixBackground className="flex grow items-center justify-center p-6">
        {children}
      </MatrixBackground>
    </div>
  )
}
