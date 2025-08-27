import { Button } from '@/components/inputs/button/button'
import Container from '@/components/layout/container/container'
import Logo from '@/components/navigation/header/logo'
import Link from 'next/link'

function Header() {
  return (
    <nav className="bg-background">
      <Container className="flex justify-between items-center p-2">
        <Link href="/" aria-label="Iwan Francis - Go to homepage">
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" className="text-md" asChild>
            <Link href="/">Home</Link>
          </Button>
          <Button variant="ghost" className="text-md" asChild>
            <Link href="/cv">Work</Link>
          </Button>
        </div>
      </Container>
    </nav>
  )
}

export default Header
