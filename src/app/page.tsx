import Container from '@/components/layout/container/container'
import Education from '@/features/landing/education/components/education'
import Experience from '@/features/landing/experience/components/experience'
import Hero from '@/features/landing/hero/components/hero'

export default function Home() {
  return (
    <Container
      as="main"
      rootClassName="flex flex-col items-stretch"
      className="flex flex-col items-center mb-64"
    >
      <Hero />
      <Experience />
    </Container>
  )
}
