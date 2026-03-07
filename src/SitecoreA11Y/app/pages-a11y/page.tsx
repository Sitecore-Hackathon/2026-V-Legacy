"use client"

import { ApplicationContext } from "@/components/examples/built-in-auth/application-context"
import { ListLanguagesFromClientSdk } from "@/components/examples/built-in-auth/with-xmc/list-languages"
import { useMarketplaceClient } from "@/components/providers/marketplace"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { useEffect, useState } from "react"

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
        <h1 className="text-3xl font-semibold tracking-tight">
          Marketplace SDK Demo CYTEST
        </h1>
        <p className="text-muted-foreground">
          Marketplace SDK with custom authentication and XMC client-side
          examples
        </p>
      </div>

      <ApplicationContext />

      <Separator />

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Pages Context</h2>
        <PagesContext />
      </div>

      <Separator />

      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">Built-in Auth Examples</h2>
        <div className="grid gap-6">
          <ListLanguagesFromClientSdk />
        </div>
      </div>
    </div>
  );
}

export default Examples;
