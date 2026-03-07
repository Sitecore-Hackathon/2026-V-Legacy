import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function analyzeAccessibility(html: string) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "system",
        content: "You are an accessibility expert specializing in WCAG."
      },
      {
        role: "user",
        content: `
Analyze this HTML for accessibility issues.

Return JSON with:
- accessibilityScore
- issues
- suggestions
- markup with issues highlighted
- markup corrected for accessibility
- image

HTML:
${html.slice(0, 15000)}
`
      }
    ]
  });

  return completion.choices[0].message.content;
}