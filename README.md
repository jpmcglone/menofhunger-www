# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
npm install
```

## Environment

Create a local `.env` file:

```bash
cp env.example .env
```

Then set:

- `NUXT_PUBLIC_API_BASE_URL`: Base URL for the API (example: `http://localhost:3001`)

## Development Server

Start the development server on `http://localhost:3000`:

```bash
npm run dev
```

## Production

Build the application for production:

```bash
npm run build
```

Locally preview production build:

```bash
npm run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## Deploy to Render

This project uses **npm** (not Bun). If Render shows `bun install` in the build log:

1. Go to **Dashboard → your service → Settings → Build & Deploy**
2. Set **Build Command** to: `npm ci && npm run build`
3. Save and redeploy

The `render.yaml` Blueprint spec defines the correct build; if your service was created manually, sync the Blueprint or update the build command as above.
