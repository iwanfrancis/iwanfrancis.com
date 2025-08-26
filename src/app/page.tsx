import Container from '@/components/layout/container/container'

export default function Home() {
  return (
    <Container
      as="main"
      rootClassName="py-16 flex flex-col items-stretch"
      className="flex flex-col items-center"
    >
      <h1 className="mb-8 bg-background p-6 pb-0 text-3xl leading-none font-josefin font-semibold sm:text-4xl md:text-5xl">
        Iwan Francis
      </h1>

      <p className="bg-background px-6 py-4 text-lg md:mx-10">
        Hi! I&apos;m Iwan Francis, a frontend developer looking for senior
        positions in London!
      </p>
    </Container>
  )
}
