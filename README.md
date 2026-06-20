This is my personal site!

## Development

Built with Next.js 15 (App Router), React 19, TypeScript and Tailwind CSS v4.

```bash
yarn dev      # dev server on localhost:3000
yarn build    # production build
yarn lint     # lint + format check (Biome)
yarn format   # format & fix in place (Biome)
```

Formatting and linting use [Biome](https://biomejs.dev) (one tool, configured in
`biome.json`). Install the **Biome VS Code extension** (`biomejs.biome`) so format-on-save
matches the pre-commit hook.
