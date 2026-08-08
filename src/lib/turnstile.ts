export const TURNSTILE_SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify"

export const TURNSTILE_LOGIN_ACTION = "turnstile-spin-v2"

type SiteverifyResponse = {
  success?: boolean
  hostname?: string
  action?: string
}

export async function verifyTurnstileToken({
  secret,
  token,
  remoteIp,
  allowedHostnames,
  expectedAction = TURNSTILE_LOGIN_ACTION,
  fetchImpl = fetch,
}: {
  secret: string
  token: string
  remoteIp?: string
  allowedHostnames?: string[]
  expectedAction?: string
  fetchImpl?: typeof fetch
}): Promise<boolean> {
  const body = new URLSearchParams({ secret, response: token })
  if (remoteIp) body.set("remoteip", remoteIp)

  let response: Response
  let result: SiteverifyResponse
  try {
    response = await fetchImpl(TURNSTILE_SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    })
    if (!response.ok) return false
    result = await response.json() as SiteverifyResponse
  } catch {
    return false
  }

  if (result.success !== true || result.action !== expectedAction) return false
  if (allowedHostnames?.length) {
    const hostname = result.hostname?.toLowerCase()
    if (!hostname || !allowedHostnames.includes(hostname)) return false
  }
  return true
}
