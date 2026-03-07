"use client"

/**
 * Accessibility Scanner (Sitecore Pages)
 *
 * Runs axe-core inside the Sitecore preview iframe using EXECUTE_IN_PREVIEW.
 * Issues are enriched by the scan API with AI explanations and suggestions.
 */

import { useMarketplaceClient } from "@/components/providers/marketplace"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import axe from "axe-core"
import { useEffect, useRef, useState } from "react"

/* -------------------------------------------------------------------------- */
/* Types */
/* -------------------------------------------------------------------------- */

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
  wcag?: string
  element: string
  html?: string
  rendering?: string
  renderingId?: string
  componentId?: string
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

/* -------------------------------------------------------------------------- */
/* Constants */
/* -------------------------------------------------------------------------- */

const EXECUTE_IN_PREVIEW = "EXECUTE_IN_PREVIEW"
const A11Y_SCAN_RESULT = "A11Y_SCAN_RESULT"

/* -------------------------------------------------------------------------- */
/* Helpers */
/* -------------------------------------------------------------------------- */

function isTrustedOrigin(origin: string) {
  return origin.includes("sitecorecloud.io") || origin === window.location.origin
}

function dedupeIssues(issues: StructuredIssue[]) {
  const map = new Map()

  issues.forEach((issue) => {
    const key = issue.type + issue.element
    if (!map.has(key)) map.set(key, issue)
  })

  return [...map.values()]
}

function calculateScore(issues: StructuredIssue[]) {
  let score = 100

  issues.forEach((i) => {
    if (i.impact === "critical") score -= 10
    if (i.impact === "serious") score -= 6
    if (i.impact === "moderate") score -= 3
  })

  return Math.max(score, 0)
}

/** Parse issue title: prefer human-readable help, fallback to formatted type (e.g. "button-name" → "Button name"). */
function formatIssueTitle(issue: StructuredIssue): string {
  const help = issue.help?.trim()
  if (help) return help
  const type = issue.type?.trim()
  if (!type) return "Accessibility issue"
  // Format kebab-case rule IDs: "button-name" → "Button name"
  return type
    .split(/[-_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
}

/* -------------------------------------------------------------------------- */
/* Extract Sitecore renderings */
/* -------------------------------------------------------------------------- */

function extractRenderings(context: unknown): ExtractedRendering[] {
  const renderings: ExtractedRendering[] = []

  try {
    const ctx = context as Record<string, unknown>
    const presentationDetails = (ctx?.pageInfo as Record<string, unknown>)?.presentationDetails

    if (typeof presentationDetails !== "string") return renderings

    const presentation = JSON.parse(presentationDetails)

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
  } catch {}

  return renderings
}

/* -------------------------------------------------------------------------- */
/* Scan API */
/* -------------------------------------------------------------------------- */

function getScanApiUrl() {
  return "/api/scan-a11y"
}

async function callScanApi(issues: StructuredIssue[]): Promise<ScanResult | { error: string }> {
  const res = await fetch(getScanApiUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ issues }),
  })

  const text = await res.text()

  try {
    const data = JSON.parse(text)

    if (!res.ok) {
      return { error: data.error ?? "Scan failed" }
    }

    return data
  } catch {
    return { error: "Invalid JSON from server" }
  }
}

/* -------------------------------------------------------------------------- */
/* Preview Scan Script */
/* -------------------------------------------------------------------------- */

function runScanInPreview() {
  const script = `
(function(){

function loadAxe(cb){
  if(window.axe){ cb(); return; }

  var s=document.createElement("script");
  s.src="https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js";
  s.onload=cb;
  document.head.appendChild(s);
}

loadAxe(function(){

  axe.run(document).then(function(results){

    var issues=[];

    (results.violations||[]).forEach(function(v){

      (v.nodes||[]).forEach(function(n){

        var selector=n.target.join(" ");
        var el=document.querySelector(selector);

        var html=null;

        if(el){
          html=el.outerHTML.substring(0,300);

          el.style.outline="3px solid red";
          el.setAttribute("data-a11y-issue",v.id);
        }

        issues.push({
          type:v.id,
          description:v.description,
          help:v.help,
          helpUrl:v.helpUrl,
          impact:v.impact,
          wcag:(v.tags||[]).join(", "),
          element:selector,
          html:html
        });

      });

    });

    window.parent.postMessage({
      type:"A11Y_SCAN_RESULT",
      issues:issues
    },"*");

  });

});

})();`.trim()

  window.parent.postMessage(
    {
      type: EXECUTE_IN_PREVIEW,
      script,
    },
    "*"
  )
}

/* -------------------------------------------------------------------------- */
/* Component */
/* -------------------------------------------------------------------------- */

export default function AccessibilityScanner() {
  const client = useMarketplaceClient()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [pagesContext, setPagesContext] = useState<unknown>(null)

  const gotResultRef = useRef(false)

  /* ---------------------------------------------------------------------- */
  /* Subscribe to pages.context */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    client.query("pages.context", {
      subscribe: true,
      onSuccess: (data) => setPagesContext(data),
      onError: () => setPagesContext(null),
    })
  }, [client])

  /* ---------------------------------------------------------------------- */
  /* Listen for preview scan results */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (!isTrustedOrigin(event.origin)) return

      if (event.data?.type !== A11Y_SCAN_RESULT) return

      gotResultRef.current = true
      setLoading(false)

      const rawIssues = event.data.issues ?? []
      const issues = dedupeIssues(rawIssues)

      if (issues.length === 0) {
        setResult({
          issues: [],
          accessibilityScore: 100,
          summary: "No accessibility issues detected.",
        })
        return
      }

      callScanApi(issues).then((res) => {
        if ("error" in res) {
          setError(res.error)
        } else {
          setResult(res)
        }
      })
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [])

  /* ---------------------------------------------------------------------- */
  /* Fallback scan */
  /* ---------------------------------------------------------------------- */

  async function fallbackRenderingScan() {
    try {
      const res = await client.query("pages.context")
      const context = (res as { data?: unknown })?.data ?? res

      const renderingsList = extractRenderings(context)

      const issues: StructuredIssue[] = renderingsList.map((r) => ({
        type: "rendering-accessibility-check",
        description: "Accessibility review required for this component",
        element: r.placeholder || "component",
        rendering: r.dataSource,
        renderingId: r.renderingId,
        componentId: r.componentId,
      }))

      const apiRes = await callScanApi(issues)

      if ("error" in apiRes) {
        setError(apiRes.error)
      } else {
        setResult(apiRes)
      }
    } catch {
      setError("Fallback scan failed")
    } finally {
      setLoading(false)
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Run scan */
  /* ---------------------------------------------------------------------- */

  function runScan() {
    setLoading(true)
    setError(null)
    setResult(null)
    gotResultRef.current = false

    runScanInPreview()

    setTimeout(() => {
      if (gotResultRef.current) return
      fallbackRenderingScan()
    }, 4000)
  }

  const renderings = extractRenderings(pagesContext)

  /* ---------------------------------------------------------------------- */
  /* UI */
  /* ---------------------------------------------------------------------- */

  if (loading) return <Skeleton className="rounded-lg w-inherit h-[90vh] m-4 bg-gray-100" />


  const scoreColor = cn({
    'text-success': result?.accessibilityScore && result.accessibilityScore > 80,
    'text-warning-400': result?.accessibilityScore && result.accessibilityScore > 60,
    'text-danger': result?.accessibilityScore && result.accessibilityScore <= 60,
  })
  const resultsBoxStyles = cn({
    'bg-success-50/30 border-success': result?.accessibilityScore && result.accessibilityScore > 80,
    'bg-warning-50/30 border-warning-300': result?.accessibilityScore && result.accessibilityScore > 60,
    'bg-danger-50/30 border-danger': result?.accessibilityScore && result.accessibilityScore <= 60,
  })

  

  return (
    <div className="p-4 flex flex-col gap-4">

      <p className="text-muted-foreground text-md">
        Scans the Sitecore preview DOM using axe-core and sends issues to AI for explanation.
      </p>

      <Button onClick={runScan} disabled={loading}>
        {loading ? "Scanning accessibility..." : "Scan page accessibility"}
      </Button>

      {error && (
        <Alert variant="danger">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
       <div className={cn("space-y-4 rounded-lg border p-4", resultsBoxStyles)}>
          <div className="flex items-center gap-1">
            <p className={cn("text-5xl font-semibold tabular-nums", scoreColor)}>
              {result.accessibilityScore}
            </p>
            <sub className="text-xl text-muted-foreground">/100</sub>
          </div>

          <ul className="space-y-3">
            {result.issues.map((i, idx) => (
              <li key={idx} className="border bg-white rounded p-3 text-sm">

                <div className="text-md font-bold text-primary">
                  {formatIssueTitle(i)}
                </div>

                {i.wcag && (
                  <div className="text-xs text-muted-foreground mt-1">
                    <b className="text-md text-gray-800">WCAG:</b> <br/> <p>{i.wcag}</p>
                  </div>
                )}

                {i.html && (
                  <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-auto">
                    {i.html}
                  </pre>
                )}

                <div className="mt-2 ">
                  <b className="text-md font-bold text-warning-400">Description:</b> <br/> <p>{i.explanation}</p>
                </div>

                <div className="mt-1">
                  <b className="text-md font-bold text-success">Fix:</b> <br/> <p>{i.suggestion}</p>
                </div>

                {i.helpUrl && (
                  <a
                    className="text-xs text-blue-500 underline mt-1 block"
                    href={i.helpUrl}
                    target="_blank"
                  >
                    Learn more
                  </a>
                )}

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