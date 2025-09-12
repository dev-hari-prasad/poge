"use client"

import { useEffect, useRef } from "react"

export function SupahubEmbed() {
  const initializedRef = useRef(false)

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    ;(function (s: any, u: Document, p: string, a: string) {
      function supahub() {
        const g = u.createElement(p)
        const h = u.getElementsByTagName(p)[0]
        ;(g as HTMLScriptElement).id = a
        ;(g as HTMLScriptElement).src = "https://widget.supahub.com/sdk.js"
        h.parentNode?.insertBefore(g, h)
        ;(g as HTMLScriptElement).onload = function () {
          ;(window as any).SupahubWidget("embed", {
            workspaceName: "poge",
            initialPage: "Board",
            hideLogo: true,
            hideNav: true,
          })
        }
      }
      if (typeof s.SupahubWidget !== "function") {
        s.SupahubWidget = function () {
          ;(s.SupahubWidget.q = s.SupahubWidget.q || []).push(arguments)
        }
      }
      if (u.readyState === "complete" || u.readyState === "interactive") supahub()
      else s.addEventListener("DOMContentLoaded", supahub)
    })(window, document, "script", "supahub-sdk")
  }, [])

  return <div data-supahub-embed className="w-full h-full overflow-auto" />
}


