"use client"

import Script from "next/script"
import { useCallback, useEffect, useRef, useState } from "react"
import { TURNSTILE_LOGIN_ACTION } from "@/src/lib/turnstile"

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: Record<string, unknown>) => string
      remove: (widgetId: string) => void
    }
  }
}

interface TurnstileWidgetProps {
  siteKey: string
  resetKey: number
  onToken: (token: string) => void
}

export default function TurnstileWidget({ siteKey, resetKey, onToken }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [scriptReady, setScriptReady] = useState(false)

  const renderWidget = useCallback(() => {
    if (!scriptReady || !window.turnstile || !containerRef.current) return
    if (widgetIdRef.current) window.turnstile.remove(widgetIdRef.current)
    containerRef.current.replaceChildren()
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      action: TURNSTILE_LOGIN_ACTION,
      theme: "auto",
      callback: (token: string) => onToken(token),
      "expired-callback": () => onToken(""),
      "error-callback": () => onToken(""),
    })
  }, [onToken, scriptReady, siteKey])

  useEffect(() => {
    renderWidget()
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [renderWidget, resetKey])

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />
      <div
        ref={containerRef}
        className="cf-turnstile flex min-h-16 justify-center"
        data-action={TURNSTILE_LOGIN_ACTION}
      />
    </>
  )
}
