import { useEffect, useRef } from "react";

const LEGACY_SHELL = "/legacy-ui-shell.html";

/**
 * Full legacy PegaProx UI (all original screens) inside an isolated iframe.
 * The shell is generated at build time from `index.html.original` + `legacy-app.js`.
 */
export function LegacyPegaproxUI() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const iframe = document.createElement("iframe");
    iframe.src = LEGACY_SHELL;
    iframe.title = "PegaProx";
    iframe.setAttribute("importance", "high");
    iframe.style.border = "0";
    iframe.style.width = "100%";
    iframe.style.height = "100vh";
    iframe.style.display = "block";

    el.appendChild(iframe);

    return () => {
      iframe.remove();
    };
  }, []);

  return <div ref={containerRef} className="min-h-screen bg-black" />;
}
