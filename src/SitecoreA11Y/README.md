# SitecoreA11Y – Sitecore Marketplace SDK App

A Next.js app built with the Sitecore Marketplace SDK, featuring accessibility-focused design using the Sitecore Blok design system.

## Tech Stack

- **Next.js 16** (App Router, Turbopack)
- **React 19**
- **Sitecore Marketplace SDK** (`client`, `xmc`, `ai`)
- **shadcn/ui** (base-nova / Blok) + **Tailwind CSS v4**
- **TypeScript 5.9**

## Getting Started

### Prerequisites

- Node.js 16+
- npm 10+
- Active Sitecore Cloud Portal account with developer permissions
- XM Cloud subscription (for XMC API features)

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app runs at `http://localhost:3000`. Set this as the **Deployment URL** in the Sitecore Cloud Portal Developer Studio when registering your app.

### Available Scripts

| Script        | Description                       |
| ------------- | --------------------------------- |
| `npm run dev` | Start dev server (Turbopack)      |
| `npm run build` | Production build                |
| `npm run start` | Start production server         |
| `npm run lint` | Run ESLint                       |
| `npm run format` | Format code with Prettier      |
| `npm run typecheck` | TypeScript type checking    |

## Marketplace SDK Integration

This app communicates with Sitecore via the Marketplace SDK's PostMessage API. It must run **inside a Sitecore iframe** (Cloud Portal or XM Cloud).

### SDK Initialization

The `MarketplaceProvider` component initializes the SDK with XMC and AI modules:

```typescript
const client = await ClientSDK.init({
  target: window.parent,
  modules: [XMC, AI],
})
```

### Extension Points

Configure your extension point route URLs in the Sitecore Cloud Portal Developer Studio to point to routes in this app. Supported extension points include:

- **Standalone** – Cloud Portal Homepage
- **Full Screen** – XM Cloud Portfolio navigation
- **Page Builder Context Panel** – Left side panel in Page Builder
- **Page Builder Custom Field** – Modal for custom field types
- **Dashboard Widget** – Draggable widgets on XM Cloud dashboard

## Adding UI Components

```bash
npx shadcn@latest add <component-name>
```

Components are placed in `components/ui/`.
