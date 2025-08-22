import Container from '@/components/layout/container/container'

export default function CV() {
  return (
    <Container
      as="main"
      rootClassName="py-16 flex flex-col items-stretch"
      className="flex flex-col items-center"
    >
      <h1 className="mb-8 bg-background p-6 pb-0 text-3xl leading-none font-semibold sm:text-4xl md:text-5xl">
        CV
      </h1>

      <div className="self-start flex flex-col items-start [&>*]:bg-background px-2">
        <p className="py-4">
          Customer focused Senior Frontend Developer with experience leading
          teams and delivering exceptional user experiences. I&apos;m committed
          to writing high quality, scalable code and driving technical best
          practices. Looking for a position where I can own and shape a product
          that I truly believe in.
        </p>

        <h3 className="font-medium text-xl">Apadmi</h3>
        <p className="text-sm text-muted-foreground">
          Technical Lead, July 2023 — April 2025
        </p>
        <ul className="list-disc pl-6">
          <li>
            Architected and led the phased rebuild of a major student letting
            website with a team of 6 developers, delivering a high-performance,
            SEO-optimized solution with NextJS, Contentful CMS, and an Express
            BFF, resulting in 5x performance increase across new pages. Provided
            post-launch support, leveraging Azure App Insights for monitoring
            and optimization, and driving incremental improvements to user
            experience and business performance through A/B testing.
          </li>
          <li>
            Built a new corporate website for a major pizza delivery service
            using NextJS and Amplience CMS. Focused on accessibility, achieved
            full test coverage via TDD, and a component library documented with
            Storybook.
          </li>
          <li>
            Supported the development of junior and mid-level frontend
            developers through mentorship, code reviews, and best practice
            sharing.
          </li>
        </ul>

        <p className="text-sm text-muted-foreground mt-4">
          Platform Lead, Feb 2022 — July 2023
        </p>
        <ul className="list-disc pl-6">
          <li>
            Led a multi-platform team in developing an audiology app for the
            hard of hearing, featuring interactive audiogram data visualizations
            and delivering a WCAG AA-compliant solution across Web, Android and
            iOS, while also assuming product ownership responsibilities to
            ensure project continuity and alignment.
          </li>
          <li>
            Built and delivered a short term car insurance quote journey with a
            team of 3 devs, using React SPA, OIDC auth, payment gateways, and a
            reusable component library with Storybook documentation. Implemented
            robust testing frameworks, including Chromatic screenshot testing
            and Selenium E2E testing.
          </li>
          <li>
            Pioneered accessibility considerations for web projects at Apadmi,
            leading knowledge sharing sessions and contributing to accessibility
            forums.
          </li>
        </ul>

        <p className="text-sm text-muted-foreground mt-4">
          Software Engineer, Aug 2020 — Feb 2022
        </p>
        <ul className="list-disc pl-6">
          <li>
            Developed a React-based contact centre tool for a large telecoms
            provider, supporting agents in handling over 1 million monthly
            calls, and enhancing customer experience through improved efficiency
            and service delivery.
          </li>
          <li>
            Contributed to the migration of a content curation platform from
            legacy web components to Next.js, drastically improving page
            performance for thousands of community members across the world.
          </li>
        </ul>

        <p className="text-sm text-muted-foreground mt-4">
          Graduate Software Engineer, Aug 2019 — Aug 2020
        </p>
        <ul className="list-disc pl-6">
          <li>
            Broadened technical skills through hands-on project contributions
            and guidance from experienced seniors.
          </li>
        </ul>

        <h3 className="font-medium text-xl mt-8">Red Hat</h3>
        <p className="text-sm text-muted-foreground">
          Graduate Consultant, 2018 — 2019
        </p>

        <h4 className="font-medium">Responsibilities:</h4>
        <ul className="list-disc pl-6">
          <li>
            Completed extensive technical and professional training, including
            instructor-led training, self-driven learning, and customer
            shadowing.
          </li>
          <li>
            Participated in conferences, community events, and university
            outreach sessions.
          </li>
        </ul>

        <h3 className="font-medium text-xl mt-8">IBM</h3>
        <p className="text-sm text-muted-foreground">
          Undergraduate Placement Student, 2016 — 2017
        </p>

        <h4 className="font-medium">Responsibilities:</h4>
        <ul className="list-disc pl-6">
          <li>
            Led development and maintenance of tooling for a major DevOps
            database migration project, impacting hundreds of staff.
          </li>
          <li>
            Drove technical decisions and implemented new tooling, requiring
            rapid skill acquisition and adaptability.
          </li>
          <li>
            Collaborated directly with stakeholders to provide support during
            system transitions.
          </li>
          <li>
            Developed a web interface using Angular and D3 to monitor IoT sensor
            data.
          </li>
          <li>
            Utilized a range of technologies, including Java, JavaScript
            (Node.js), Perl, and web languages.
          </li>
        </ul>
      </div>
    </Container>
  )
}
