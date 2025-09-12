import { NextResponse } from "next/server"

// Proxies a form POST to a subscribe backend.
// Supports either:
// - Google Apps Script Web App (env: GAS_SUBSCRIBE_URL or APP_SCRIPT_URL)
// - Google Forms (env: GOOGLE_FORMS_URL/GOOGLE_FORMS_ACTION_URL + GOOGLE_FORMS_EMAIL_FIELD)
export async function POST(req: Request) {
  try {
    // Robust body parsing covering form-encoded, multipart, and JSON
    let email = ""
    let source = "unknown"

    try {
      const contentType = req.headers.get("content-type") || ""
      if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
        const formData = await req.formData()
        email = (formData.get("email") as string | null)?.trim() || ""
        source = (formData.get("source") as string | null)?.trim() || "unknown"
      } else if (contentType.includes("application/json")) {
        const json = await req.json().catch(() => ({} as any))
        email = (json?.email as string | undefined)?.trim() || ""
        source = (json?.source as string | undefined)?.trim() || "unknown"
      } else {
        const text = await req.text().catch(() => "")
        if (text) {
          const params = new URLSearchParams(text)
          email = (params.get("email") || "").trim()
          source = (params.get("source") || "unknown").trim()
        }
      }
    } catch {}

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const gasUrl = process.env.GAS_SUBSCRIBE_URL || process.env.APP_SCRIPT_URL
    const gformUrl = process.env.GOOGLE_FORMS_URL || process.env.GOOGLE_FORMS_ACTION_URL
    const gformEmailField = process.env.GOOGLE_FORMS_EMAIL_FIELD

    let upstreamUrl: string | undefined
    let upstreamBody: URLSearchParams | undefined

    if (gasUrl) {
      upstreamUrl = gasUrl
      upstreamBody = new URLSearchParams({ email, source })
    } else if (gformUrl) {
      upstreamUrl = gformUrl
      const fieldName = gformEmailField || "email"
      upstreamBody = new URLSearchParams({ [fieldName]: email, source })
      // Google Forms often requires submit to be present but it is optional
      upstreamBody.append("submit", "Submit")
    }

    if (!upstreamUrl || !upstreamBody) {
      return NextResponse.json({ error: "Subscribe endpoint not configured", hint: "Set GAS_SUBSCRIBE_URL or GOOGLE_FORMS_URL in .env.local and restart the server." }, { status: 500 })
    }

    const res = await fetch(upstreamUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: upstreamBody,
      cache: "no-store",
      redirect: "follow",
    })

    if (!res.ok) {
      const text = await res.text().catch(() => "")
      // Debug log to help diagnose upstream failures during development
      try {
        console.error("/api/subscribe upstream failure", {
          upstreamUrl,
          status: res.status,
          statusText: res.statusText,
          bodySample: text?.slice(0, 300),
        })
      } catch {}
      return NextResponse.json(
        { error: "Upstream error", status: res.status, statusText: res.statusText, details: text },
        { status: 502 },
      )
    }

    // If this looks like an AJAX request, return JSON instead of redirecting
    const accept = req.headers.get("accept") || ""
    const xrw = req.headers.get("x-requested-with") || ""
    if (accept.includes("application/json") || xrw.toLowerCase() === "xmlhttprequest") {
      return NextResponse.json({ ok: true })
    }

    // Otherwise, redirect back to the referring page with a success indicator
    const referer = req.headers.get("referer") || "/"
    const url = new URL(referer)
    url.searchParams.set("subscribed", "1")
    return NextResponse.redirect(url.toString(), { status: 303 })
  } catch (err) {
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 })
  }
}


