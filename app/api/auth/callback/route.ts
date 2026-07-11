import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin
  const redirectUri = `${appUrl.replace(/\/$/, '')}/api/auth/callback`

  if (error || !code) {
    return NextResponse.redirect(new URL(`/?error=${error ?? 'no_code'}`, appUrl))
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  const tokenData = await tokenRes.json()

  if (!tokenData.access_token) {
    const msg = tokenData.error_description ?? tokenData.error ?? 'token_exchange_failed'
    return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(msg)}`, appUrl))
  }

  // Pass token to the client via URL hash (never stored server-side)
  return NextResponse.redirect(
    new URL(`/#access_token=${tokenData.access_token}`, appUrl)
  )
}
