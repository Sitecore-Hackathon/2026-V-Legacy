"use client";

import { useState } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState("");

  const scan = async () => {
    const res = await fetch("/api/scan", {
      method: "POST",
      body: JSON.stringify({ url }),
    });

    const data = await res.json();
    setResult(data.result);
  };

  return (
    <div className="p-10">
      <h1 className="text-3xl font-bold">A11y Copilot</h1>

      <input
        className="border p-2 mt-4"
        placeholder="Enter page URL"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />

      <button
        className="ml-3 bg-blue-600 text-white px-4 py-2"
        onClick={scan}
      >
        Scan Page
      </button>

      <pre className="mt-6 whitespace-pre-wrap">{result}</pre>
    </div>
  );
}