import OpenAI from "openai"
import { NextResponse } from "next/server"

const MAX_HTML_LENGTH = 50_000

export type ScanA11yIssue = {
  severity: "error" | "warning" | "info"
  message: string
  wcag?: string
  element?: string
}

export type ScanA11yResult = {
  accessibilityScore: number
  issues: ScanA11yIssue[]
  suggestions: string[]
  summary?: string
}

function parseJsonFromContent(content: string): ScanA11yResult | null {
  const trimmed = content.trim()
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null
  try {
    return JSON.parse(jsonMatch[0]) as ScanA11yResult
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured" },
      { status: 500 }
    )
  }

  let body: { html?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    )
  }

  const html = typeof body.html === "string" ? body.html : ""
  if (!html) {
    return NextResponse.json(
      { error: "Missing or empty 'html' in request body" },
      { status: 400 }
    )
  }

  const truncated = html.length > MAX_HTML_LENGTH
  const htmlToAnalyze = html.slice(0, MAX_HTML_LENGTH)

  const openai = new OpenAI({ apiKey })

  const systemPrompt = `You are an accessibility expert specializing in WCAG 2.1. Analyze the provided HTML and return a single JSON object (no markdown, no code fence) with exactly these keys:
- accessibilityScore: number 0-100
- issues: array of objects with: severity ("error" | "warning" | "info"), message (string), wcag (optional, e.g. "1.1.1"), element (optional, short description of the element)
- suggestions: array of strings with concrete fix suggestions
- summary: optional short paragraph summarizing the overall accessibility state

Focus on: missing alt text, poor color contrast, missing labels, heading order, focus management, ARIA misuse, keyboard access, and semantic HTML.`

  const userPrompt = `Analyze this HTML for accessibility issues and return only the JSON object as described.
${truncated ? "\n(HTML was truncated due to length.)\n" : ""}

HTML:
${htmlToAnalyze}`

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    })

    const raw = completion.choices[0]?.message?.content
    if (!raw) {
      return NextResponse.json(
        { error: "Empty response from model" },
        { status: 502 }
      )
    }

    const parsed = parseJsonFromContent(raw) || (JSON.parse(raw) as ScanA11yResult)
    if (truncated) {
      parsed.summary = (parsed.summary || "") + " (Analysis was run on truncated HTML.)"
    }
    return NextResponse.json(parsed)
  } catch (err) {
    const message = err instanceof Error ? err.message : "OpenAI request failed"
    return NextResponse.json(
      { error: message },
      { status: 502 }
    )
  }
}
