"use client"

import { useMarketplaceClient } from "@/components/providers/marketplace"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"

type RenderingInfo = {
  component: string
  placeholder?: string
  instanceId?: string
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

/* ------------------------------------------------ */
/* Extract Sitecore renderings */
/* ------------------------------------------------ */

function extractRenderings(context: any): RenderingInfo[] {

  const presentationDetails = context?.pageInfo?.presentationDetails

  if (!presentationDetails) return []

  try {

    const presentation = JSON.parse(presentationDetails)

    const renderings: RenderingInfo[] = []

    for (const device of presentation.devices ?? []) {

      for (const r of device.renderings ?? []) {

        renderings.push({
          component: r.id,
          placeholder: r.placeholderKey,
          instanceId: r.instanceId
        })

      }

    }

    return renderings

  } catch {

    console.warn("Failed parsing presentationDetails")

    return []

  }

}

export default function AccessibilityScanner() {

  const client = useMarketplaceClient()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [renderings, setRenderings] = useState<RenderingInfo[]>([])

  /* ------------------------------------------------ */
  /* Subscribe to Sitecore Pages context */
  /* ------------------------------------------------ */

  useEffect(() => {

    client.query("pages.context", {
      subscribe: true,
      onSuccess: (data) => {

        const r = extractRenderings(data)

        console.log("Detected renderings:", r)

        setRenderings(r)

      },
      onError: (err) => {
        console.error("pages.context error", err)
      },
    })

  }, [client])

  /* ------------------------------------------------ */
  /* Receive DOM from preview iframe */
  /* ------------------------------------------------ */

  useEffect(() => {

    function handleMessage(event: MessageEvent) {

      if (!event.data) return

      if (event.data.type === "A11Y_SCAN_REQUEST") return
      if (event.data.type !== "A11Y_SCAN_RESULT") return

      if (event.data.error) {

        setError(event.data.error)
        setLoading(false)

        return
      }

      const html = event.data.html

      console.log("DOM received length:", html?.length)

      fetch("/api/scan-a11y", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          html,
          renderings
        })
      })
      .then(r => r.json())
      .then(data => {

        console.log("Scan result:", data)

        setResult(data)
        setLoading(false)

      })
      .catch(err => {

        console.error(err)

        setError("Scan API failed")
        setLoading(false)

      })

    }

    window.addEventListener("message", handleMessage)

    return () => window.removeEventListener("message", handleMessage)

  }, [renderings])

  /* ------------------------------------------------ */
  /* Broadcast scan request */
  /* ------------------------------------------------ */

  function broadcastScanRequest() {

    const msg = { type: "A11Y_SCAN_REQUEST" }

    function broadcast(win: Window | null) {

      if (!win) return

      try {
        win.postMessage(msg, "*")
      } catch {}

      try {

        for (let i = 0; i < win.frames.length; i++) {

          broadcast(win.frames[i])

        }

      } catch {}

    }

    broadcast(window.top)

  }

  /* ------------------------------------------------ */
  /* Run scan */
  /* ------------------------------------------------ */

  function runScan() {

    if (renderings.length === 0) {
      console.warn("Renderings not detected yet")
    }

    setLoading(true)
    setError(null)
    setResult(null)

    broadcastScanRequest()

  }

  /* ------------------------------------------------ */
  /* UI */
  /* ------------------------------------------------ */

  return (
    <div className="space-y-4">

      <p className="text-muted-foreground text-sm">
        Scans the rendered Sitecore page DOM and sends issues to AI for explanation.
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
        <div className="space-y-4 rounded-lg border bg-muted/30 p-4">

          <div className="flex items-center gap-2">
            <span className="text-2xl font-semibold">
              {result.accessibilityScore}
            </span>
            <span>/ 100</span>
          </div>

          <ul className="space-y-3">

            {result.issues.map((i, idx) => (

              <li key={idx} className="border rounded p-3 text-sm">

                <div className="font-medium">
                  {i.help ?? i.type}
                </div>

                {i.rendering && (
                  <div className="text-xs text-purple-600 mt-1">
                    Rendering: {i.rendering}
                  </div>
                )}

                {i.wcag && (
                  <div className="text-xs text-muted-foreground mt-1">
                    WCAG: {i.wcag}
                  </div>
                )}

                {i.html && (
                  <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-auto">
                    {i.html}
                  </pre>
                )}

                <p className="mt-2">{i.explanation}</p>

                <p className="mt-1">
                  <b>Fix:</b> {i.suggestion}
                </p>

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

          <summary>
            Renderings on page ({renderings.length})
          </summary>

          <pre className="mt-1 overflow-auto rounded bg-muted p-2">
            {JSON.stringify(renderings, null, 2)}
          </pre>

        </details>

      )}

    </div>
  )
}