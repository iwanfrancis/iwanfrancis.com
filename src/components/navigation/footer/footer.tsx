import { Github, Linkedin, Mail } from 'lucide-react'
import { Button } from '@/components/inputs/button/button'
import Container from '@/components/layout/container/container'
import { EMAIL } from '@/config/constants'
import ScrollToTopButton from './scroll-to-top-button'

function Footer() {
  return (
    <footer className="bg-background p-2 md:p-6">
      <Container className="flex flex-row items-center gap-4 justify-center">
        <div />
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8">
            <a
              href="https://github.com/iwanfrancis"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
            >
              <Github className="h-4 w-4" />
            </a>
          </Button>
          <Button variant="ghost" size="icon" asChild className="h-8 w-8">
            <a
              href="https://www.linkedin.com/in/iwan-francis/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
            >
              <Linkedin className="h-4 w-4" />
            </a>
          </Button>
          <Button variant="ghost" size="icon" asChild className="h-8 w-8">
            <a href={`mailto:${EMAIL}`} aria-label="Email">
              <Mail className="h-4 w-4" />
            </a>
          </Button>
          <ScrollToTopButton />
        </div>
      </Container>
    </footer>
  )
}

export default Footer
