"use client"

import { ApplicationContext } from "@/components/examples/built-in-auth/application-context"
import { ListLanguagesFromClientSdk } from "@/components/examples/built-in-auth/with-xmc/list-languages"
import { useMarketplaceClient } from "@/components/providers/marketplace"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { useEffect, useState } from "react"

type A11yIssue = {
  severity: "error" | "warning" | "info"
  message: string
  wcag?: string
  element?: string
}

type ScanA11yResult = {
  accessibilityScore: number
  issues: A11yIssue[]
  suggestions: string[]
  summary?: string
}

function AccessibilityScanner() {
  const [result, setResult] = useState<ScanA11yResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function runScan() {
    setError(null)
    setResult(null)
    setLoading(true)
    try {
      const html =
        typeof document !== "undefined"
          ? document.body?.innerHTML ?? document.documentElement?.outerHTML ?? ""
          : ""
      const res = await fetch("/api/scan-a11y", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? `Request failed (${res.status})`)
        return
      }
      setResult(data as ScanA11yResult)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Scan the current page with an LLM to find accessibility issues (WCAG).
      </p>
      <Button
        variant="default"
        colorScheme="primary"
        onClick={runScan}
        disabled={loading}
      >
        {loading ? "Scanning…" : "Scan for accessibility issues"}
      </Button>
      {error && (
        <Alert variant="danger">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {result && (
        <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
          <div className="flex items-center gap-4">
            <span className="text-2xl font-semibold tabular-nums">
              {result.accessibilityScore}
            </span>
            <span className="text-muted-foreground">/ 100</span>
          </div>
          {result.summary && (
            <p className="text-sm text-muted-foreground">{result.summary}</p>
          )}
          {result.issues.length > 0 && (
            <div>
              <h3 className="mb-2 font-semibold">Issues</h3>
              <ul className="list-inside list-disc space-y-1 text-sm">
                {result.issues.map((issue, i) => (
                  <li key={i} className="flex flex-wrap gap-1">
                    <span
                      className={
                        issue.severity === "error"
                          ? "text-danger-600 dark:text-danger-400"
                          : issue.severity === "warning"
                            ? "text-warning-600 dark:text-warning-400"
                            : "text-muted-foreground"
                      }
                    >
                      [{issue.severity}]
                    </span>
                    {issue.wcag && (
                      <span className="text-muted-foreground">
                        {issue.wcag}
                      </span>
                    )}
                    {issue.message}
                    {issue.element && (
                      <span className="text-muted-foreground">
                        — {issue.element}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {result.suggestions.length > 0 && (
            <div>
              <h3 className="mb-2 font-semibold">Suggestions</h3>
              <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                {result.suggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PagesContext() {
  const client = useMarketplaceClient()
  const [pagesContext, setPagesContext] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    client.query("pages.context", {
      subscribe: true,
      onSuccess: (data) => {
        setPagesContext(data)
        setLoading(false)
      },
      onError: (err) => {
        setError(
          err instanceof Error ? err.message : "Failed to retrieve pages context"
        )
        setLoading(false)
      },
    })
  }, [client])

  if (loading) return <Skeleton className="h-24 w-full" />

  if (error) {
    return (
      <Alert variant="danger">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <pre className="bg-muted p-4 rounded-md text-sm overflow-auto">
      {JSON.stringify(pagesContext, null, 2)}
    </pre>
  )
}

function Examples() {
  return (
    <div className="container mx-auto p-6 space-y-8 max-w-3xl">
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Accessibility Scan</h2>
        <AccessibilityScanner />
      </div>
    </div>
  );
}

export default Examples;
