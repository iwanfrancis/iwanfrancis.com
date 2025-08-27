import Container from '@/components/layout/container/container'

export default function Experiments() {
  return (
    <Container
      as="main"
      rootClassName="py-16 flex flex-col items-stretch"
      className="flex flex-col items-center"
    >
      <h1 className="mb-8 bg-background p-6 pb-0 text-3xl leading-none font-josefin font-semibold sm:text-4xl md:text-5xl">
        Experiments
      </h1>
    </Container>
  )
}
