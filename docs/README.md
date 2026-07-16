# Website

This website is built using [Docusaurus](https://docusaurus.io/), a modern static website generator.

## Installation

```bash
yarn
```

## Local Development

```bash
yarn start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

## Build

```bash
yarn build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

## Deployment

This site deploys as its **own Vercel project** at `docs.<domain>` — separate
from the Next.js app, so it does **not** inherit the app's environment. You
**must** set one env var in the docs project's dashboard (Production + Preview):

```
NEXT_PUBLIC_MAIN_DOMAIN = https://regarded.games
```

From it the config derives the navbar links (App → `https://app.<domain>`,
Project → `https://<domain>`) and the docs canonical URL. If it is unset, a
production build **fails** rather than silently shipping `localhost` links (see
`docusaurus.config.ts`). Local `yarn start` / `yarn build` without the var keep
the `localhost` fallbacks.

### GitHub Pages

Using SSH:

```bash
USE_SSH=true yarn deploy
```

Not using SSH:

```bash
GIT_USER=<Your GitHub username> yarn deploy
```

If you are using GitHub pages for hosting, this command is a convenient way to build the website and push to the `gh-pages` branch.
