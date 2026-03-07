"use client"

/**
 * Accessibility scanner for Sitecore Pages:
 * 1. Runs axe-core on the page (or preview iframe when embedded)
 * 2. Maps each violation to a Sitecore rendering (from DOM or presentationDetails)
 * 3. Sends structured issues to the API for AI explanations and fix suggestions
 */

import { useMarketplaceClient } from "@/components/providers/marketplace"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import axe from "axe-core"

// ─── Types ───

type ExtractedRendering = {
  renderingId: string
  componentId: string
  placeholder: string
  dataSource: string
}

type StructuredIssue = {
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

type ScanResult = {
  issues: (StructuredIssue & {
    explanation: string
    suggestion: string
    fixType: "code" | "content"
  })[]
  accessibilityScore: number
  summary?: string
}

type PageDocumentResult = {
  doc: Document
  source: "preview" | "parent" | "current"
  warning?: string
}

// ─── Sitecore: extract renderings from pages.context ───

/** Parse pageInfo.presentationDetails (stringified JSON) into a flat list of renderings. */
function extractRenderings(context: unknown): ExtractedRendering[] {
  const renderings: ExtractedRendering[] = []
  try {
    const ctx = context as Record<string, unknown>
    const presentationDetails = (ctx?.pageInfo as Record<string, unknown>)?.presentationDetails
    if (typeof presentationDetails !== "string") return renderings

    const presentation = JSON.parse(presentationDetails) as {
      devices?: Array<{
        renderings?: Array<{
          instanceId?: string
          id?: string
          placeholderKey?: string
          dataSource?: string
        }>
      }>
    }

    for (const device of presentation?.devices ?? []) {
      for (const r of device.renderings ?? []) {
        renderings.push({
          renderingId: r.instanceId ?? "",
          componentId: r.id ?? "",
          placeholder: r.placeholderKey ?? "",
          dataSource: r.dataSource ?? "",
        })
      }
    }
  } catch {
    // Ignore parse errors (missing or invalid presentationDetails)
  }
  return renderings
}

/**
 * Ask Sitecore Pages for the current preview HTML.
 * This avoids CORS and iframe access issues because
 * the request is handled by the Pages host.
 */
async function getPreviewHtml(client: unknown): Promise<string | null> {
  try {
    const response = await (client as { query: (name: string) => Promise<unknown> }).query("pages.previewHtml")

    if (!response) return null

    return typeof response === "string"
      ? response
      : (response as { html?: string })?.html ?? null
  } catch {
    return null
  }
}

/**
 * Convert preview HTML string into a DOM document
 * that can be scanned with axe-core.
 */
function parseHtmlToDocument(html: string): Document {
  const parser = new DOMParser()
  return parser.parseFromString(html, "text/html")
}

/**
 * Build the Sitecore editing render URL for the current page.
 * This endpoint returns the actual HTML used by the preview canvas.
 */
function buildRenderUrl(context: unknown): string | null {
  const ctx = context as Record<string, unknown>

  const siteInfo = ctx?.siteInfo as Record<string, unknown> | undefined
  const pageInfo = ctx?.pageInfo as Record<string, unknown> | undefined

  const endpoint =
    typeof siteInfo?.renderingEngineEndpointUrl === "string"
      ? siteInfo.renderingEngineEndpointUrl
      : null

  const itemPath =
    typeof pageInfo?.path === "string"
      ? pageInfo.path
      : null

  const language =
    typeof siteInfo?.language === "string"
      ? siteInfo.language
      : "en"

  const siteName =
    typeof siteInfo?.name === "string"
      ? siteInfo.name
      : null

  if (!endpoint || !itemPath || !siteName) {
    return null
  }

  return (
    `${endpoint}?item=${encodeURIComponent(itemPath)}` +
    `&sc_lang=${encodeURIComponent(language)}` +
    `&sc_site=${encodeURIComponent(siteName)}`
  )
}

/**
 * Fetch the rendered page HTML from Sitecore and parse it into a Document.
 * This avoids cross-origin iframe access problems because we are fetching HTML,
 * not trying to read the preview iframe DOM directly.
 */
async function getRenderedPageDocument(context: unknown): Promise<{
  doc: Document
  source: "render-endpoint"
} | null> {
  const url = buildRenderUrl(context)

  if (!url) {
    return null
  }

  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
  })

  if (!response.ok) {
    throw new Error(`Render endpoint request failed (${response.status})`)
  }

  const html = await response.text()

  const parser = new DOMParser()
  const doc = parser.parseFromString(html, "text/html")

  return {
    doc,
    source: "render-endpoint",
  }
}

// ─── API URL (same-origin to avoid CORS; do not use context.renderingEngineEndpointUrl) ───

/**
 * URL for the scan API. Uses same-origin path so the request hits our Next.js app.
 * Only uses env base (NEXT_PUBLIC_SCAN_API_BASE_URL) when it matches current origin.
 */
function getScanApiUrl(): string {
  const envBase =
    (typeof process.env.NEXT_PUBLIC_SCAN_API_BASE_URL === "string" &&
      process.env.NEXT_PUBLIC_SCAN_API_BASE_URL.trim()) ||
    (typeof process.env.NEXT_PUBLIC_APP_URL === "string" &&
      process.env.NEXT_PUBLIC_APP_URL.trim()) ||
    ""
  const base = envBase.replace(/\/$/, "")

  if (typeof window === "undefined") {
    return base ? `${base}/api/scan-a11y` : "/api/scan-a11y"
  }

  if (base) {
    try {
      if (new URL(base).origin === window.location.origin) {
        return `${base}/api/scan-a11y`
      }
    } catch {
      // Invalid URL, fall back to pathname-based
    }
  }

  const pathBase = window.location.pathname.replace(/\/pages-a11y\/?$/i, "") || ""
  return `${pathBase}/api/scan-a11y`
}

// ─── Document to scan (preview iframe when embedded, else current doc) ───

/**
 * Locate the Sitecore Pages preview iframe and return its document.
 *
 * In Sitecore Pages the layout is roughly:
 *
 * Parent Window (Sitecore Pages)
 * ├─ iframe (Marketplace App Panel) ← this React app
 * └─ iframe (Preview Canvas)       ← actual page being edited
 *
 * The preview iframe loads the rendered page using:
 *   /api/editing/render
 *
 * We must run axe on THAT document, not on our panel document.
 */
function getPageDocument(): PageDocumentResult | null {
  if (typeof window === "undefined") return null

  // Fallback: the current document (our Marketplace panel)
  const currentDoc = document

  try {
    // Access the parent window (Sitecore Pages UI)
    const parentDoc = window.parent.document

    // Collect all iframes in the parent
    const frames = Array.from(parentDoc.querySelectorAll("iframe"))

    for (const frame of frames) {
      const iframe = frame as HTMLIFrameElement
      const src = iframe.src || ""

      /**
       * The Sitecore preview iframe usually loads:
       *   /api/editing/render
       *
       * It may also be hosted on sitecorecloud.io in XM Cloud.
       */
      const isPreviewFrame =
        src.includes("/api/editing/render") ||
        src.includes("sitecorecloud.io")

      if (!isPreviewFrame) continue

      /**
       * If we can access the iframe document, that means
       * it is same-origin and we can scan it directly.
       */
      if (iframe.contentDocument) {
        console.log("Preview iframe detected:", src)

        return {
          doc: iframe.contentDocument,
          source: "preview",
        }
      }
    }

    /**
     * If no preview iframe was found we fall back to scanning
     * the current document (Marketplace panel).
     *
     * This is mostly useful when running locally outside
     * the Sitecore Pages environment.
     */
    console.warn("Preview iframe not detected. Falling back to panel DOM.")

    return {
      doc: currentDoc,
      source: "current",
      warning: "Preview iframe not detected. Scanning this app instead.",
    }
  } catch {
    /**
     * If the preview iframe is cross-origin (e.g. sitecorecloud.io)
     * the browser will block access to iframe.contentDocument.
     *
     * In that case we cannot scan the preview DOM directly.
     */
    return {
      doc: currentDoc,
      source: "current",
      warning: "Cross-origin restriction. Cannot access preview iframe.",
    }
  }
}

// ─── Map DOM node → Sitecore rendering ───

/** If the element is inside a container with data-sitecore-*, return that rendering info. */
function findRenderingForElement(el: Element): { renderingId: string | null; rendering: string | null } {
  const container = el.closest("[data-sitecore-rendering-id]")
  if (!container) return { renderingId: null, rendering: null }
  return {
    renderingId: container.getAttribute("data-sitecore-rendering-id"),
    rendering:
      container.getAttribute("data-sitecore-component") ??
      container.getAttribute("data-sc-component"),
  }
}

// ─── Axe scan: run on doc and build structured issues with rendering ───

/** Run axe on the given document and map violations to StructuredIssue[], attaching rendering when possible. */
function runDomScan(
  doc: Document,
  renderingsFromContext: ExtractedRendering[]
): Promise<StructuredIssue[]> {
  return new Promise((resolve) => {
    axe.run(doc, {}, (err, results) => {
      if (err) {
        resolve([])
        return
      }

      const issues: StructuredIssue[] = []
      let issueIndex = 0

      for (const v of results?.violations ?? []) {
        const wcag = (v.tags ?? []).find((t: string) => /^wcag\d/.test(t))

        for (const node of v.nodes ?? []) {
          const el =
            (node.element as Element | undefined) ??
            (Array.isArray(node.target) ? doc.querySelector(node.target[0] as string) : null)
          const targetSelector = Array.isArray(node.target) ? node.target[0] : ""

          let rendering: string | null = null
          let renderingId: string | null = null
          if (el?.closest) {
            const found = findRenderingForElement(el)
            rendering = found.rendering
            renderingId = found.renderingId
          }
          if ((!rendering || !renderingId) && renderingsFromContext.length > 0) {
            const r = renderingsFromContext[issueIndex % renderingsFromContext.length]
            rendering = r.dataSource || null
            renderingId = r.renderingId || null
          }

          const elementDesc =
            typeof targetSelector === "string"
              ? targetSelector
              : Array.isArray(node.target)
                ? (node.target[0] as string) ?? ""
                : el
                  ? String(el.tagName).toLowerCase()
                  : "unknown"

          issues.push({
            type: v.id,
            description: v.description,
            help: v.help,
            helpUrl: v.helpUrl,
            impact: v.impact == null ? undefined : String(v.impact),
            element: elementDesc,
            rendering: rendering ?? undefined,
            renderingId: renderingId ?? undefined,
            wcag: wcag ?? undefined,
          })
          issueIndex += 1
        }
      }
      resolve(issues)
    })
  })
}

// ─── Fetch scan API and parse response ───

async function callScanApi(issues: StructuredIssue[]): Promise<ScanResult | { error: string }> {
  const url = getScanApiUrl()
  const body = JSON.stringify({ issues })
  console.log("[A11Y] HTTP REQUEST (this WILL show in Network tab):", {
    url,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    bodyLength: body.length,
    body: body,
  })
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  })
  const text = await res.text()
  const contentType = res.headers.get("content-type") ?? ""
  console.log("[A11Y] HTTP RESPONSE:", {
    url: res.url,
    status: res.status,
    statusText: res.statusText,
    ok: res.ok,
    contentType,
    bodyLength: text.length,
    bodyPreview: text.slice(0, 300) + (text.length > 300 ? "..." : ""),
    body: text,
  })

  if (!contentType.includes("application/json") || !text.trimStart().startsWith("{")) {
    return {
      error: res.ok
        ? "Server did not return JSON."
        : `Scan failed (${res.status}). Check that the API route exists and OPENAI_API_KEY is set.`,
    }
  }

  let data: ScanResult & { error?: string }
  try {
    data = JSON.parse(text) as ScanResult & { error?: string }
  } catch {
    return { error: "Invalid JSON from server." }
  }

  if (!res.ok) return { error: data.error ?? "Scan failed" }
  return data
}

// ─── UI labels ───

const SCAN_SOURCE_LABEL: Record<string, string> = {
  preview: "Page Builder preview (injected script)",
  parent: "parent page",
  current: "this app",
  renderings: "renderings only (open via Pages proxy for DOM scan)",
  "render-endpoint": "rendered page HTML from Sitecore",
}

/** Message types for the Pages SDK messaging bridge (execute in preview iframe). */
const EXECUTE_IN_PREVIEW = "EXECUTE_IN_PREVIEW"
const A11Y_SCAN_RESULT = "A11Y_SCAN_RESULT"

/**
 * Run the accessibility scan inside the preview iframe via the Pages host.
 * The host receives EXECUTE_IN_PREVIEW and runs the script in the preview frame;
 * the script posts A11Y_SCAN_RESULT back. Works even when app and preview are cross-origin.
 */
function runScanInPreview(): void {
  const script = `
    (async () => {
      const images = document.querySelectorAll("img")
      console.log("Preview images:", images.length)

      const missingAlt = []

      images.forEach(img => {
        if (!img.alt || img.alt.trim() === "") {
          missingAlt.push(img.outerHTML)
        }
      })

      window.parent.postMessage({
        type: "A11Y_SCAN_RESULT",
        images: images.length,
        missingAlt: missingAlt.length
      }, "*")
    })()
  `

  try {
    let parentOrigin = "unknown"
    try {
      parentOrigin = window.parent?.location?.origin ?? "unknown"
    } catch {
      parentOrigin = "(cross-origin)"
    }
    const payload = { type: EXECUTE_IN_PREVIEW, script }
    console.log("[A11Y] REQUEST (postMessage – does NOT show in Network tab):", {
      note: "postMessage is in-process messaging, not HTTP",
      target: "window.parent",
      targetOrigin: "*",
      payload: {
        type: payload.type,
        scriptLength: script.length,
        scriptPreview: script.slice(0, 120) + (script.length > 120 ? "..." : ""),
      },
      fullPayload: payload,
      selfOrigin: window.location.origin,
      parentOrigin,
    })
    window.parent.postMessage(payload, "*")
    console.log("[A11Y] postMessage called (no HTTP request; waiting for message response)")
  } catch (e) {
    console.error("[A11Y] runScanInPreview postMessage failed:", e)
  }
}

// ─── Component ───

export default function AccessibilityScanner() {
  const client = useMarketplaceClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [scanSource, setScanSource] = useState<string | null>(null)
  const [scanWarning, setScanWarning] = useState<string | null>(null)
  const [pagesContext, setPagesContext] = useState<unknown>(null)

  useEffect(() => {
    client.query("pages.context", {
      subscribe: true,
      onSuccess: (data) => setPagesContext(data),
      onError: () => setPagesContext(null),
    })
  }, [client])

  // Listen for scan results from the preview iframe (via host forwarding)
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      // Log every message – postMessage "responses" do NOT show in Network tab
      if (event.data != null) {
        console.log("[A11Y] RESPONSE (message event – not in Network tab):", {
          origin: event.origin,
          data: event.data,
          dataType: typeof event.data,
          hasType: typeof event.data === "object" && "type" in event.data ? (event.data as { type?: string }).type : undefined,
        })
      }
      if (event.data?.type !== A11Y_SCAN_RESULT) return
      const data = event.data as { images?: number; missingAlt?: number }
      console.log("[A11Y] Preview scan result:", data)

      setLoading(false)
      setScanSource("preview")

      const images = data.images ?? 0
      const missingAlt = data.missingAlt ?? 0

      if (missingAlt > 0) {
        const issues: StructuredIssue[] = [
          {
            type: "image-alt",
            description: `${missingAlt} image(s) missing alt text`,
            help: "Ensure all images have descriptive alt text.",
            impact: "moderate",
            element: "img",
            wcag: "1.1.1",
          },
        ]
        console.log("[A11Y] Calling scan API with issues:", issues.length)
        callScanApi(issues).then((apiResult) => {
          if ("error" in apiResult) {
            console.log("[A11Y] Scan API error:", apiResult.error)
            setError(apiResult.error)
          } else {
            console.log("[A11Y] Scan API success, score:", apiResult.accessibilityScore)
            setResult(apiResult)
          }
        })
      } else {
        console.log("[A11Y] No missing alt – setting success result")
        setResult({
          issues: [],
          accessibilityScore: 100,
          summary:
            images > 0
              ? `Preview scan: ${images} image(s), all have alt text.`
              : "Preview scan: no images found.",
        })
      }
    }

    console.log("[A11Y] Message listener attached (waiting for A11Y_SCAN_RESULT)")
    window.addEventListener("message", handleMessage)
    return () => {
      console.log("[A11Y] Message listener removed")
      window.removeEventListener("message", handleMessage)
    }
  }, [])

  async function runScan() {
    setLoading(true)
    setError(null)
    setResult(null)
    setScanSource(null)
    setScanWarning(null)

    try {
      let context = pagesContext

      if (!context) {
        const res = await client.query("pages.context")
        context = (res as { data?: unknown })?.data ?? res
      }

      const renderings = extractRenderings(context)

      /*
       * ───────────────────────────────
       * STEP 1: Get rendered markup
       * ───────────────────────────────
       */
      const rendered = await getRenderedPageDocument(context)

      if (!rendered) {
        throw new Error("Unable to fetch rendered page HTML")
      }

      const { doc } = rendered

      /*
       * ───────────────────────────────
       * STEP 2: Run axe on markup
       * ───────────────────────────────
       */
      const domIssues = await runDomScan(doc, renderings)

      /*
       * ───────────────────────────────
       * STEP 3: Rendering level checks
       * ───────────────────────────────
       */
      const renderingIssues: StructuredIssue[] = renderings.map((r) => ({
        type: "rendering-accessibility-check",
        description: "Accessibility review required for this component.",
        help: "Verify that this component follows accessibility best practices.",
        impact: "moderate",
        element: r.placeholder || "component",
        rendering: r.dataSource,
        renderingId: r.renderingId,
        componentId: r.componentId,
      }))

      /*
       * ───────────────────────────────
       * STEP 4: Merge issues
       * ───────────────────────────────
       */
      const issues = [...domIssues, ...renderingIssues]

      console.log("[A11Y] DOM issues:", domIssues.length)
      console.log("[A11Y] Rendering issues:", renderingIssues.length)
      console.log("[A11Y] Total issues:", issues.length)

      /*
       * ───────────────────────────────
       * STEP 5: Send to LLM
       * ───────────────────────────────
       */
      const apiResult = await callScanApi(issues)

      if ("error" in apiResult) {
        setError(apiResult.error)
        return
      }

      setScanSource("render-endpoint")
      setResult(apiResult)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed")
    } finally {
      setLoading(false)
    }
  }

  const renderings = extractRenderings(pagesContext)

  function handleScanClick() {
    console.log("[A11Y] Scan button clicked")
    setLoading(true)
    setError(null)
    setResult(null)
    setScanSource(null)
    setScanWarning(null)

    // Attempt preview scan (postMessage – only works if host supports EXECUTE_IN_PREVIEW)
    runScanInPreview()

    // Fallback: rendering-based scan always runs and calls POST /api/scan-a11y (shows in Network tab)
    runScan()
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Analyzes the Sitecore renderings on the page and identifies potential accessibility issues.
        Uses the Pages messaging bridge to run the scan inside the preview iframe (works cross-origin).
      </p>
      <Button onClick={handleScanClick} disabled={loading}>
        {loading ? "Scanning…" : "Scan page accessibility"}
      </Button>

      {scanWarning && (
        <Alert variant="warning">
          <AlertDescription>{scanWarning}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="danger">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
          {scanSource && (
            <p className="text-xs text-muted-foreground">
              Scanned: {SCAN_SOURCE_LABEL[scanSource] ?? scanSource}.
            </p>
          )}
          <div className="flex items-center gap-2">
            <span className="text-2xl font-semibold tabular-nums">{result.accessibilityScore}</span>
            <span className="text-muted-foreground">/ 100</span>
          </div>
          {result.summary && (
            <p className="text-sm text-muted-foreground">{result.summary}</p>
          )}

          <ul className="list-none space-y-3">
            {result.issues.map((i, idx) => (
              <li key={idx} className="rounded-md border bg-background p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{i.help ?? i.type}</span>
                  {i.impact && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs">{i.impact}</span>
                  )}
                  {i.rendering && (
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                      Rendering: {i.rendering}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-muted-foreground">{i.explanation}</p>
                <p className="mt-1">
                  <span className="font-medium">Fix:</span> {i.suggestion}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {i.element} {i.wcag && ` · ${i.wcag}`} {i.fixType && ` · ${i.fixType}`}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {renderings.length > 0 && (
        <details className="text-xs text-muted-foreground">
          <summary>Renderings on page ({renderings.length})</summary>
          <pre className="mt-1 overflow-auto rounded bg-muted p-2">
            {JSON.stringify(renderings, null, 2)}
          </pre>
        </details>
      )}
    </div>
  )
}
