import OpenAI from "openai"
import { NextResponse } from "next/server"

const CORS_ORIGINS = [
  /^https:\/\/[^/]+\.sitecorecloud\.io$/,
  /^https:\/\/[^/]+\.sitecore\.cloud$/,
  /^http:\/\/localhost(:\d+)?$/,
]

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin") ?? ""

  const allow =
    origin && CORS_ORIGINS.some((re) => re.test(origin)) ? origin : null

  const h: HeadersInit = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  }

  if (allow) h["Access-Control-Allow-Origin"] = allow

  return h
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) })
}

export type EnrichedIssue = {
  type: string
  description: string
  impact: "critical" | "serious" | "moderate" | "minor"
  element: string
  wcag: string
  explanation: string
  suggestion: string
  fixType: "code" | "content"
  rendering?: string
}

function computeScore(issues: EnrichedIssue[]): number {
  const criticalOrSerious = issues.filter(
    (i) => i.impact === "critical" || i.impact === "serious"
  )

  const penalty =
    criticalOrSerious.length * 15 +
    (issues.length - criticalOrSerious.length) * 5

  return Math.max(0, Math.round(100 - penalty))
}

function cleanHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\s{2,}/g, " ")
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text)
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        return JSON.parse(match[0])
      } catch {}
    }
    return { issues: [] }
  }
}

export async function POST(request: Request) {

  const headers = corsHeaders(request)

  try {

    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY not configured" },
        { status: 500, headers }
      )
    }

    let body: { html?: string; renderings?: string[] }

    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400, headers }
      )
    }

    const html = body.html ?? ""
    const renderings = body.renderings ?? []

    if (!html) {
      return NextResponse.json(
        { error: "No HTML provided" },
        { status: 400, headers }
      )
    }

    console.log("[scan-a11y] HTML length:", html.length)

    const cleanedHtml = cleanHtml(html).slice(0, 50000)

    const openai = new OpenAI({ apiKey })

    const systemPrompt = `
You are an expert WCAG 2.1 accessibility auditor.

Analyze the provided HTML markup and detect accessibility violations.

You will also receive a list of Sitecore renderings present on the page.

When possible, associate accessibility issues with the rendering most likely
responsible for the markup.

Use semantic clues such as:
- CSS classes
- section structure
- component naming patterns

Return STRICT JSON.

{
  "issues":[
    {
      "type":"string",
      "description":"string",
      "impact":"critical | serious | moderate | minor",
      "element":"short css selector",
      "wcag":"WCAG reference",
      "explanation":"why this is a problem",
      "suggestion":"how to fix it",
      "fixType":"code | content",
      "rendering":"optional rendering name"
    }
  ]
}
`

    const userPrompt = `
Sitecore renderings on this page:

${JSON.stringify(renderings, null, 2)}

Audit this HTML for accessibility issues.

HTML:

${cleanedHtml}
`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    })

    const raw = completion.choices[0]?.message?.content ?? "{}"

    console.log("[scan-a11y] raw response:", raw)

    const parsed = safeJsonParse(raw)

    const issues: EnrichedIssue[] = parsed.issues ?? []

    const score = computeScore(issues)

    const criticalOrSerious = issues.filter(
      (i) => i.impact === "critical" || i.impact === "serious"
    )

    return NextResponse.json(
      {
        issues,
        accessibilityScore: score,
        summary: `${issues.length} issue(s) found. ${criticalOrSerious.length} critical/serious.`,
      },
      { headers }
    )

  } catch (err) {

    console.error("[scan-a11y] API error:", err)

    const message =
      err instanceof Error ? err.message : "Unknown server error"

    return NextResponse.json({ error: message }, { status: 500, headers })
  }
}