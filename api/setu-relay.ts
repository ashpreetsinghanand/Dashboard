/**
 * Setu relay: Setu's DigiLocker API refuses calls from outside India (our API runs on Render, US), so the backend
 * sends its Setu calls here and this function, pinned to Vercel's Mumbai region (vercel.json "regions": ["bom1"]),
 * forwards them. Only DigiLocker paths are forwarded, only to Setu, and only for callers holding SETU_RELAY_KEY.
 * GET /setu-relay/health needs no key: it pings Setu without credentials to show whether Setu accepts this region.
 */
// Node provides process at runtime; declared here so the project needs no @types/node
declare const process: { env: Record<string, string | undefined> }

const SETU = process.env.SETU_DIGILOCKER_BASE_URL ?? 'https://dg-sandbox.setu.co'
const FORWARDED = ['x-client-id', 'x-client-secret', 'x-product-instance-id', 'content-type']

async function relay(request: Request): Promise<Response> {
  const path = new URL(request.url).searchParams.get('path') ?? ''

  if (path === 'health') {
    const probe = await fetch(`${SETU}/api/digilocker/`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
    const text = await probe.text()
    // 401/400 JSON = Setu answered (region accepted, just no keys); 403 HTML = blocked at Setu's edge
    return Response.json({ region: process.env.VERCEL_REGION ?? 'unknown', setuStatus: probe.status, blockedAtEdge: probe.status === 403 && text.includes('<') })
  }

  const key = process.env.SETU_RELAY_KEY
  if (!key || request.headers.get('x-relay-key') !== key) return new Response('Forbidden', { status: 403 })
  if (!/^api\/digilocker(\/|$)/.test(path)) return new Response('Not found', { status: 404 })

  const headers = new Headers()
  for (const name of FORWARDED) {
    const value = request.headers.get(name)
    if (value) headers.set(name, value)
  }
  // Setu's create endpoint is /api/digilocker/ with the slash; the rewrite drops it
  const target = path === 'api/digilocker' ? 'api/digilocker/' : path
  const upstream = await fetch(`${SETU}/${target}`, {
    method: request.method,
    headers,
    body: request.method === 'GET' ? undefined : await request.text(),
  })
  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
  })
}

export const GET = relay
export const POST = relay
