import type { Email, GmailLabel } from './types'

const BASE = 'https://gmail.googleapis.com/gmail/v1/users/me'

async function gfetch(path: string, token: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gmail API error ${res.status}: ${err}`)
  }
  return res.json()
}

interface GmailPayload {
  headers?: { name: string; value: string }[]
}

function detectCategory(labelIds: string[]): Email['category'] {
  if (labelIds.includes('CATEGORY_SOCIAL')) return 'Social'
  if (labelIds.includes('CATEGORY_PROMOTIONS')) return 'Promotions'
  if (labelIds.includes('CATEGORY_UPDATES')) return 'Updates'
  if (labelIds.includes('CATEGORY_FORUMS')) return 'Forums'
  if (labelIds.includes('CATEGORY_PERSONAL')) return 'Primary'
  if (labelIds.includes('INBOX')) return 'Primary'
  return 'Other'
}

function parseHeader(headers: { name: string; value: string }[], name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? ''
}

function parseFrom(raw: string): { name: string; email: string } {
  const match = raw.match(/^(.*?)\s*<(.+?)>$/)
  if (match) return { name: match[1].replace(/"/g, '').trim(), email: match[2] }
  return { name: raw, email: raw }
}

// Fetch emails from inbox (Primary, Social, Promotions), newest first
export async function fetchInboxEmails(token: string, maxResults = 100): Promise<Email[]> {
  const data = await gfetch(
    `/messages?maxResults=${maxResults}&q=in:inbox`,
    token
  )
  const ids: { id: string; threadId: string }[] = data.messages ?? []

  if (ids.length === 0) return []

  // Fetch full message details in parallel (batch of 20 at a time)
  const emails: Email[] = []
  const BATCH = 20
  for (let i = 0; i < ids.length; i += BATCH) {
    const chunk = ids.slice(i, i + BATCH)
    const results = await Promise.all(
      chunk.map(({ id }) =>
        gfetch(`/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`, token).catch(() => null)
      )
    )
    for (const msg of results) {
      if (!msg) continue
      const headers: { name: string; value: string }[] = msg.payload?.headers ?? []
      const rawFrom = parseHeader(headers, 'From')
      const { name, email } = parseFrom(rawFrom)

      const labelIds: string[] = msg.labelIds ?? []
      emails.push({
        id: msg.id,
        threadId: msg.threadId,
        subject: parseHeader(headers, 'Subject') || '(no subject)',
        from: name || email,
        fromEmail: email,
        snippet: msg.snippet ?? '',
        category: detectCategory(labelIds),
        date: new Date(parseInt(msg.internalDate)),
        labelIds,
      })
    }
  }

  // Sort newest first
  emails.sort((a, b) => b.date.getTime() - a.date.getTime())
  return emails
}

export async function fetchLabels(token: string): Promise<GmailLabel[]> {
  const data = await gfetch('/labels', token)
  return (data.labels ?? [])
    .filter((l: { id: string; name: string; type: string }) =>
      // Exclude noisy system labels, keep user labels + a few useful system ones
      l.type === 'user' || ['INBOX', 'STARRED', 'IMPORTANT'].includes(l.id)
    )
    .map((l: { id: string; name: string; type: string }) => ({
      id: l.id,
      name: l.name,
      type: l.type === 'user' ? 'user' : 'system',
    }))
}

export async function archiveEmail(token: string, id: string): Promise<void> {
  await gfetch(`/messages/${id}/modify`, token, {
    method: 'POST',
    body: JSON.stringify({ removeLabelIds: ['INBOX'] }),
  })
}

export async function trashEmail(token: string, id: string): Promise<void> {
  await gfetch(`/messages/${id}/trash`, token, { method: 'POST' })
}

export async function untrashEmail(token: string, id: string): Promise<void> {
  await gfetch(`/messages/${id}/untrash`, token, { method: 'POST' })
}

export async function labelAndArchiveEmail(
  token: string,
  id: string,
  labelId: string
): Promise<void> {
  await gfetch(`/messages/${id}/modify`, token, {
    method: 'POST',
    body: JSON.stringify({
      addLabelIds: [labelId],
      removeLabelIds: ['INBOX'],
    }),
  })
}

export async function restoreToInbox(
  token: string,
  id: string,
  removeLabelIds: string[]
): Promise<void> {
  await gfetch(`/messages/${id}/modify`, token, {
    method: 'POST',
    body: JSON.stringify({
      addLabelIds: ['INBOX'],
      removeLabelIds,
    }),
  })
}
