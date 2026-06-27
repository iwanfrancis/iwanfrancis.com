import { Download } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/inputs/button/button'
import SocialLinks from '@/components/navigation/social-links/social-links'
import { siteConfig } from '@/config/site'

function Hero() {
  return (
    <section
      id="hero"
      className="w-full flex flex-col justify-center items-center min-h-dvh"
    >
      <h1 className="bg-background px-6 pt-6 text-4xl leading-none font-josefin font-semibold sm:text-5xl md:text-7xl">
        Iwan Francis
      </h1>

      <p className="bg-background mt-8 px-6 py-4 text-lg md:mx-10 text-center">
        Senior Software Engineer @{' '}
        <a
          href="https://valvespace.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Valve Space
        </a>
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

      <SocialLinks
        links={siteConfig.socials}
        className="mt-4 p-2 bg-background"
      />
    </section>
  )
}

export default Hero
