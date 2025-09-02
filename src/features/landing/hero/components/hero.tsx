import Headshot from './headshot'

function Hero() {
  return (
    <section
      id="hero"
      className="w-full flex flex-col justify-center items-center min-h-dvh"
    >
      <Headshot className="mb-8" />

      <h1 className="mb-8 bg-background px-6 pt-6 text-4xl leading-none font-josefin font-semibold sm:text-5xl md:text-7xl">
        Iwan Francis
      </h1>

      <p className="bg-background px-6 py-4 text-lg md:mx-10">
        Hi! I&apos;m Iwan Francis, a frontend developer looking for senior
        positions in London!
      </p>
    </section>
  )
}

export default Hero
