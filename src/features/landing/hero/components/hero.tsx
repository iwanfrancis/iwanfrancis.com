import Link from 'next/link'
import Headshot from './headshot'
import { Button } from '@/components/inputs/button/button'
import { Download, Github, Linkedin, Mail } from 'lucide-react'
import { EMAIL } from '@/config/constants'

function Hero() {
  return (
    <section
      id="hero"
      className="w-full flex flex-col justify-center items-center min-h-dvh"
    >
      {/* <Headshot className="mb-8" /> */}

      <h1 className="bg-background px-6 pt-6 text-4xl leading-none font-josefin font-semibold sm:text-5xl md:text-7xl">
        Iwan Francis
      </h1>

      <p className="bg-background mt-8 px-6 py-4 text-lg md:mx-10 text-center">
        I&apos;m Iwan Francis, a senior developer who believes that great
        products are built with the customer in mind. With a strong foundation
        in frontend development and a focus on UX, I craft digital experiences
        that are both functional and delightful, and meet the needs of real
        users.
      </p>

      <div className="flex gap-4 mt-4 p-2 bg-background">
        <Button asChild size="lg">
          <Link href="/#experience">See my work</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <a
            href="/files/iwan-francis-cv.pdf"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Download />
            Get My CV
          </a>
        </Button>
      </div>

      <div className="flex items-center gap-2 mt-4 p-2 bg-background">
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
      </div>
    </section>
  )
}

export default Hero
