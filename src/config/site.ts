import { Github, Linkedin, type LucideIcon, Mail } from 'lucide-react'

export type NavLink = {
  label: string
  href: string
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
