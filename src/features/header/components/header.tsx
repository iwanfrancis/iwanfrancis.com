import Container from '@/components/layout/container/container'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/navigation/navigation-menu/navigation-menu'
import { GithubIcon, LinkedinIcon } from 'lucide-react'
import Link from 'next/link'

function Header() {
  return (
    <Container className="flex justify-center my-4">
      <NavigationMenu className="bg-background px-1" viewport={false}>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuLink asChild>
              <Link href="/">Home</Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
          {/* <NavigationMenuItem>
            <NavigationMenuLink asChild>
              <Link href="/cv">Work</Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink asChild>
              <Link href="/experiments">Experiments</Link>
            </NavigationMenuLink>
          </NavigationMenuItem> */}
          <NavigationMenuItem>
            <NavigationMenuTrigger>Links</NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid gap-4">
                <li>
                  <NavigationMenuLink asChild>
                    <a
                      href="https://www.linkedin.com/in/iwan-francis/"
                      className="flex-row items-center gap-2"
                    >
                      <LinkedinIcon />
                      LinkedIn
                    </a>
                  </NavigationMenuLink>
                  <NavigationMenuLink asChild>
                    <a
                      href="https://github.com/iwanfrancis"
                      className="flex-row items-center gap-2"
                    >
                      <GithubIcon />
                      GitHub
                    </a>
                  </NavigationMenuLink>
                </li>
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </Container>
  )
}

export default Header
