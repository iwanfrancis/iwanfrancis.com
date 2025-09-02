import { Separator } from '@/components/layout/seperator/separator'
import { ADDRESSES } from '@/config/constants'
import Company from '@/features/landing/experience/components/company'

function Education() {
  return (
    <section className="flex flex-col items-start bg-background p-2 md:p-4 mt-8 w-full">
      <h2 className="font-josefin text-3xl">Education</h2>
      <Separator orientation="horizontal" decorative className="mb-4" />

      <Company
        company="Cardiff University"
        website={ADDRESSES.CARDIFF}
        logoSrc="/logos/cardiff-university.svg"
        subTitle="Software Engineering BSc, First Class Honours, 2014 — 2018"
      />
    </section>
  )
}

export default Education
