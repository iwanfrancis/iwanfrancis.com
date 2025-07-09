import Container from '../components/Layout/Container/Container'

export default function Home() {
  return (
    <Container
      as="main"
      rootClassName="min-h-screen py-16 flex flex-col justify-center items-stretch"
      className="flex flex-col items-center"
    >
      <h1 className="mb-8 bg-slate-50 p-6 pb-0 text-5xl font-semibold leading-none sm:text-7xl md:text-8xl">
        Iwan Francis
      </h1>

      <p className="bg-slate-50 px-6 py-4 text-lg md:mx-10">
        Hi! I&apos;m Iwan Francis, a frontend developer looking for senior
        positions in London!
      </p>
    </Container>
  )
}
