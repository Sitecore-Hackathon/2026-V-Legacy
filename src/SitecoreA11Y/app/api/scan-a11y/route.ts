/**
 * Accessibility scan API: takes structured issues from axe-core (client-side),
 * asks the LLM for explanations and fix suggestions, returns enriched issues.
 * No HTML is sent to the LLM (saves tokens and keeps scan logic in the client).
 */

import OpenAI from "openai"
import { NextResponse } from "next/server"

// ─── CORS (for when the app is embedded on Sitecore and calls this API cross-origin) ───

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

// ─── Types ───

/** One issue from the client (rendering check or axe-core + optional rendering info). */
export type StructuredIssue = {
  type: string
  description?: string
  help?: string
  helpUrl?: string
  impact?: string
  element: string
  rendering?: string
  renderingId?: string
  componentId?: string
  wcag?: string
}

/** Same as StructuredIssue plus AI-generated explanation, suggestion, fixType. */
export type EnrichedIssue = StructuredIssue & {
  explanation: string
  suggestion: string
  fixType: "code" | "content"
}

// ─── Helpers ───

/** Parse LLM JSON response into an array of { explanation, suggestion, fixType }. */
function parseAiResults(raw: string): Array<{ explanation: string; suggestion: string; fixType: string }> {
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed.results)) return parsed.results
    if (Array.isArray(parsed)) return parsed
    return parsed.issues ?? []
  } catch {
    return []
  }
}

/** Compute a 0–100 score from issue count and impact. */
function computeScore(issues: EnrichedIssue[]): number {
  const criticalOrSerious = issues.filter(
    (i) => i.impact === "critical" || i.impact === "serious"
  )
  const penalty =
    criticalOrSerious.length * 15 + (issues.length - criticalOrSerious.length) * 5
  return Math.max(0, Math.round(100 - penalty))
}

// ─── POST: enrich issues with AI explanations ───

export async function POST(request: Request) {
  const headers = corsHeaders(request)

  // 1. Validate config and body
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY not configured" },
      { status: 500, headers }
    )
  }

  let body: { issues?: StructuredIssue[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers }
    )
  }

  const issues = Array.isArray(body.issues) ? body.issues : []
  if (issues.length === 0) {
    return NextResponse.json(
      { issues: [], accessibilityScore: 100, summary: "No accessibility issues found." },
      { headers }
    )
  }

  // 2. Ask LLM for explanation + suggestion + fixType per issue
  const openai = new OpenAI({ apiKey })
  const systemPrompt = `You are a WCAG accessibility expert. You receive a list of accessibility checks for Sitecore renderings.
Each item represents a component used on a page. Based on the rendering name and context, determine possible accessibility concerns and suggest fixes.
Examples:
- Images → alt text
- Headings → heading hierarchy
- Buttons → accessible labels
- Links → descriptive text
- Forms → label associations
For each item return one object with: explanation (1-2 sentences on why it matters and who it affects), suggestion (concrete fix: code = markup/ARIA/structure; content = editable text/alt in CMS), fixType ("code" or "content"). Return a JSON object with a single key "results" whose value is an array of objects (explanation, suggestion, fixType), one per issue in the same order.`
  const userPrompt = `Explain and suggest fixes for these ${issues.length} issue(s). Return JSON: { "results": [ { "explanation": "...", "suggestion": "...", "fixType": "code"|"content" }, ... ] } (${issues.length} items). Issues: ${JSON.stringify(issues, null, 2)}`

  try {
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
    const aiResponses = parseAiResults(raw)

    // 3. Merge AI output into each issue (same order)
    const enriched: EnrichedIssue[] = issues.map((issue, i) => {
      const r = aiResponses[i]
      return {
        ...issue,
        explanation:
          r?.explanation ?? issue.description ?? issue.help ?? "No explanation.",
        suggestion: r?.suggestion ?? "Review and fix manually.",
        fixType: (r?.fixType === "content" ? "content" : "code") as "code" | "content",
      }
    })

    const score = computeScore(enriched)
    const criticalOrSerious = enriched.filter(
      (i) => i.impact === "critical" || i.impact === "serious"
    )

    return NextResponse.json(
      {
        issues: enriched,
        accessibilityScore: score,
        summary: `${enriched.length} issue(s) found. ${criticalOrSerious.length} critical/serious.`,
      },
      { headers }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : "LLM request failed"
    return NextResponse.json({ error: message }, { status: 502, headers })
  }
}
