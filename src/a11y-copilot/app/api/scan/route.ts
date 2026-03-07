import { NextRequest, NextResponse } from "next/server";
import { scanPage } from "@/lib/scanPage";
import { analyzeAccessibility } from "@/lib/analyzeAcessibility";

export async function POST(req: NextRequest) {
  const { url } = await req.json();

  const html = await scanPage(url);

  const result = await analyzeAccessibility(html);

  return NextResponse.json({ result });
}