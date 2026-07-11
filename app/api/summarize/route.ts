import { NextRequest, NextResponse } from 'next/server'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

export async function POST(req: NextRequest) {
  const { subject, from, snippet } = await req.json()

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    // Gracefully fall back to snippet if no key configured
    return NextResponse.json({ summary: snippet ?? '' })
  }

  try {
    const res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 150,
        messages: [
          {
            role: 'user',
            content: `Summarize this email in 2-3 sentences. Be specific about what it contains, any action required, and key details like dates, amounts, or deadlines. No filler phrases.\n\nFrom: ${from}\nSubject: ${subject}\nPreview: ${snippet}`,
          },
        ],
      }),
    })

    const data = await res.json()
    const summary = data.choices?.[0]?.message?.content?.trim() ?? snippet ?? ''
    return NextResponse.json({ summary })
  } catch {
    return NextResponse.json({ summary: snippet ?? '' })
  }
}
