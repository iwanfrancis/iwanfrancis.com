import type { Metadata } from 'next'
import LoginForm from '@/features/auth/components/login-form'

export const metadata: Metadata = {
  title: 'Sign in · Admin',
}

type LoginPageProps = {
  searchParams: Promise<{ next?: string | string[] }>
}

/**
 * Only accept an internal redirect target, to avoid an open redirect. It must
 * be a single leading `/` not followed by another `/` or a `\` — some browsers
 * treat `//host` and `/\host` as protocol-relative — and contain no backslashes
 * anywhere. Anything else falls back to /artifacts.
 */
function safeNext(next: string | string[] | undefined): string {
  if (typeof next !== 'string') {
    return '/artifacts'
  }
  const isInternal = /^\/(?![/\\])/.test(next) && !next.includes('\\')
  return isInternal ? next : '/artifacts'
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams
  const target = safeNext(next)

  return (
    <div className="bg-background/80 flex w-full max-w-sm flex-col gap-6 rounded-xl border p-8 shadow-lg backdrop-blur">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Admin sign in</h1>
        <p className="text-muted-foreground text-sm">
          Enter the admin password to manage hosted artifacts.
        </p>
      </div>
      <LoginForm next={target} />
    </div>
  )
}
