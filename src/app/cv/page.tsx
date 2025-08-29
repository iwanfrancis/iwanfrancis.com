import Container from '@/components/layout/container/container'
import { Separator } from '@/components/layout/seperator/separator'
import CompanySection from './_components/company-section'
import { ADDRESSES } from '@/config/constants'

export default function CV() {
  return (
    <Container
      as="main"
      rootClassName="py-16 flex flex-col items-stretch"
      className="flex flex-col items-center"
    >
      <h1 className="font-josefin bg-background p-6 pb-0 text-3xl leading-none font-semibold sm:text-4xl md:text-5xl">
        CV
      </h1>

      <div className="self-start flex flex-col items-start bg-background p-2 md:p-4 mt-8">
        <p>
          Customer focused Senior Frontend Developer with experience leading
          teams and delivering exceptional user experiences. I&apos;m committed
          to writing high quality, scalable code and driving technical best
          practices. Looking for a position where I can own and shape a product
          that I truly believe in.
        </p>

        <h2 className="font-josefin text-3xl mt-8">Experience</h2>
        <Separator orientation="horizontal" decorative className="mb-4" />

        <CompanySection
          company="Apadmi"
          website={ADDRESSES.APADMI}
          logoSrc="/logos/apadmi.svg"
          subTitle="Technical Lead, July 2023 — April 2025"
          summary="Led projects for clients across a wide variety of industries, including student letting, insurance, telecoms and healthcare. Specialised in frontend development, building scalable, accessible, and performant solutions. Pioneered best practices for testing and accessibility."
          skills={[
            'React',
            'TypeScript',
            'Next.js',
            'Node.js',
            'Jest',
            'Cypress',
            'Storybook',
            'REST',
            'GraphQL',
            'AWS',
          ]}
        >
          <ul className="list-disc pl-6">
            <li>
              Architected and led the phased rebuild of a major student letting
              website with a team of 6 developers, delivering a
              high-performance, SEO-optimized solution with NextJS, Contentful
              CMS, and an Express BFF, resulting in 5x performance increase
              across new pages. Provided post-launch support, leveraging Azure
              App Insights for monitoring and optimization, and driving
              incremental improvements to user experience and business
              performance through A/B testing.
            </li>
            <li>
              Built a new corporate website for a major pizza delivery service
              using NextJS and Amplience CMS. Focused on accessibility, achieved
              full test coverage via TDD, and a component library documented
              with Storybook.
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
              hard of hearing, featuring interactive audiogram data
              visualizations and delivering a WCAG AA-compliant solution across
              Web, Android and iOS, while also assuming product ownership
              responsibilities to ensure project continuity and alignment.
            </li>
            <li>
              Built and delivered a short term car insurance quote journey with
              a team of 3 devs, using React SPA, OIDC auth, payment gateways,
              and a reusable component library with Storybook documentation.
              Implemented robust testing frameworks, including Chromatic
              screenshot testing and Selenium E2E testing.
            </li>
            <li>
              Pioneered accessibility considerations for web projects at Apadmi,
              leading knowledge sharing sessions and contributing to
              accessibility forums.
            </li>
          </ul>

          <p className="text-sm text-muted-foreground mt-4">
            Software Engineer, Aug 2020 — Feb 2022
          </p>
          <ul className="list-disc pl-6">
            <li>
              Developed a React-based contact centre tool for a large telecoms
              provider, supporting agents in handling over 1 million monthly
              calls, and enhancing customer experience through improved
              efficiency and service delivery.
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
        </CompanySection>

        <CompanySection
          company="Red Hat"
          website={ADDRESSES.RED_HAT}
          logoSrc="/logos/redhat.svg"
          subTitle="Graduate Consultant, 2018 — 2019"
          summary="Participated in an extensive technical and professional training program, gaining valuable experience in the Red Hat portfolio and agile working methodologies."
          skills={['RHEL', 'OpenShift', 'Ansible', 'Scrum']}
          className="mt-4"
        >
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
        </CompanySection>

        <CompanySection
          company="IBM"
          website={ADDRESSES.IBM}
          logoSrc="/logos/ibm.svg"
          subTitle="Undergraduate Placement Student, 2016 — 2017"
          summary={
            'Developed and maintained tooling to support a major database migration project affecting hundreds of staff across the Hursley site.'
          }
          skills={['Java', 'Perl', 'TypeScript', 'Angular', 'HTML', 'CSS']}
          className="mt-4"
        >
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
              Developed a web interface using Angular and D3 to monitor IoT
              sensor data.
            </li>
            <li>
              Utilized a range of technologies, including Java, JavaScript
              (Node.js), Perl, and web languages.
            </li>
          </ul>
        </CompanySection>

        {/* <h2 className="font-josefin text-3xl mt-8">Skills</h2>
        <Separator orientation="horizontal" decorative className="mb-4" />

        <h2 className="font-josefin text-3xl">Education</h2>
        <Separator orientation="horizontal" decorative className="mb-4" /> */}
      </div>
    </Container>
  )
}
