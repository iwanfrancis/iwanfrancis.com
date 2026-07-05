import { Github, Linkedin, type LucideIcon, Mail } from 'lucide-react'

export type NavLink = {
  label: string
  href: string
  /** Opens in a new tab with safe rel and an external affordance; omit for internal/anchor links. */
  external?: boolean
}

export type SocialLink = {
  label: string
  href: string
  icon: LucideIcon
  /** Opens in a new tab with safe rel; omit for internal/mailto links. */
  external?: boolean
}

export const siteConfig = {
  nav: [
    { label: 'Home', href: '/#hero' },
    { label: 'Experience', href: '/#experience' },
    { label: 'Thingies', href: '/thingies' },
    { label: 'Balls', href: 'https://balls.iwans.space', external: true },
  ] satisfies NavLink[],
  socials: [
    {
      label: 'GitHub',
      href: 'https://github.com/iwanfrancis',
      icon: Github,
      external: true,
    },
    {
      label: 'LinkedIn',
      href: 'https://www.linkedin.com/in/iwan-francis/',
      icon: Linkedin,
      external: true,
    },
    {
      label: 'Email',
      href: 'mailto:iwanfrancis@gmail.com',
      icon: Mail,
    },
  ] satisfies SocialLink[],
}
