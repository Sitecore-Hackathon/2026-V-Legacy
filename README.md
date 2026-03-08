![Hackathon Logo](docs/images/hackathon.png?raw=true "Hackathon Logo")
# Sitecore Hackathon 2026

- MUST READ: **[Submission requirements](SUBMISSION_REQUIREMENTS.md)**
- [Entry form template](ENTRYFORM.md)
  
# Hackathon Submission Entry form


You can find a very good reference to Github flavoured markdown reference in [this cheatsheet](https://github.com/adam-p/markdown-here/wiki/Markdown-Cheatsheet). If you want something a bit more WYSIWYG for editing then could use [StackEdit](https://stackedit.io/app) which provides a more user friendly interface for generating the Markdown code. Those of you who are [VS Code fans](https://code.visualstudio.com/docs/languages/markdown#_markdown-preview) can edit/preview directly in that interface too.

## Team name
V Legacy

## Category
Best Marketplace App for Sitecore AI - Build something publishable. Not just a demo.

## Description

**SitecoreA11Y** is a Sitecore Marketplace app that brings real-time accessibility auditing directly into the Sitecore Pages editor. Content authors and developers can scan any page for WCAG violations without leaving the CMS.

- **Module Purpose**  
  A Page Builder Context Panel extension that scans the live preview for accessibility issues using [axe-core](https://github.com/dequelabs/axe-core), then enriches every violation with AI-generated explanations and fix suggestions powered by the Sitecore Marketplace AI SDK.

- **What problem was solved**  
  Accessibility defects are usually caught late — during QA or after launch — because content authors have no visibility into WCAG compliance while they build pages. Manual audits are slow, expensive, and disconnected from the authoring workflow.

  - **How this module solves it**  
    1. The app subscribes to `pages.context` so it reacts whenever the author navigates or edits a page.  
    2. On demand, it injects axe-core into the Sitecore preview iframe via `EXECUTE_IN_PREVIEW`, runs a full DOM audit, and highlights offending elements with a red outline.  
    3. Raw violations are deduplicated, scored by impact, and sent to an AI endpoint that returns plain-language explanations and actionable fix suggestions (categorised as code or content fixes).  
    4. Results are displayed in-context with an accessibility score (0–100), WCAG tags, the offending HTML snippet, and deep links to Deque's rule documentation — all visible in the Page Builder side panel without any context switch.

## Video link
⟹ Provide a video highlighing your Hackathon module submission and provide a link to the video. You can use any video hosting, file share or even upload the video to this repository. _Just remember to update the link below_

⟹ [Replace this Video link](#video-link)

## Pre-requisites and Dependencies

- **Sitecore XM Cloud** subscription with access to the **Pages** editor
- **Sitecore Cloud Portal** developer account with permissions to register Marketplace apps
- **Node.js** 16+ and **npm** 10+
- **OpenAI API key** — used by the `/api/scan-a11y` route to generate plain-language explanations and fix suggestions for each accessibility violation
- **Sitecore Marketplace SDK packages** (installed via npm):
  - `@sitecore-marketplace-sdk/client` ^0.3.2
  - `@sitecore-marketplace-sdk/xmc` ^0.4.1
  - `@sitecore-marketplace-sdk/ai` ^0.1.0
- **axe-core** ^4.11.1 — injected at runtime into the Sitecore preview iframe for WCAG auditing

## Installation instructions

1. Clone this repository.
2. Install dependencies and run the SitecoreA11Y app:
   ```bash
   cd src/SitecoreA11Y
   npm install
   ```
3. Configure environment variables (see **Configuration** below).
4. Start the dev server: `npm run dev`.
5. Register and deploy the app in the Sitecore Cloud Portal (Marketplace) and connect it to your XM Cloud Pages environment so the context panel appears in the Pages editor.

### Configuration

Set the following in a `.env` file in `src/SitecoreA11Y/` (copy from `.env.example`). **Do not commit `.env` or put API keys in this repository.**

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | Your OpenAI API key. Used by `/api/scan-a11y` to generate explanations and fix suggestions for accessibility violations. |
| `NEXT_PUBLIC_SCAN_API_BASE_URL` | No | Full URL of your deployed Next.js app (e.g. `https://your-app.vercel.app`) when the app is embedded in XM Cloud, so the scan can call your API. If omitted, the app uses the host's API when available. |

Example (replace with your own values locally; never commit real keys):

```bash
cp .env.example .env
# Edit .env and set OPENAI_API_KEY and optionally NEXT_PUBLIC_SCAN_API_BASE_URL
```

## Usage instructions
⟹ Provide documentation about your module, how do the users use your module, where are things located, what do the icons mean, are there any secret shortcuts etc.

Include screenshots where necessary. You can add images to the `./images` folder and then link to them from your documentation:

![Hackathon Logo](docs/images/hackathon.png?raw=true "Hackathon Logo")

You can embed images of different formats too:

![Deal With It](docs/images/deal-with-it.gif?raw=true "Deal With It")

And you can embed external images too:

![Random](https://thiscatdoesnotexist.com/)

## Comments
If you'd like to make additional comments that is important for your module entry.