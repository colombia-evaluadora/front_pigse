import { env } from "@/config/env"

export interface Crumb {
  label: string
  to?: string
}

export type BreadcrumbSpec = Crumb[] | ((params: Record<string, string>) => Crumb[])

declare module "@tanstack/react-router" {
  interface StaticDataRouteOption {
    breadcrumb?: BreadcrumbSpec
  }
}

interface BreadcrumbMatch {
  params: unknown
  staticData: { breadcrumb?: BreadcrumbSpec }
}

export function resolveBreadcrumbTrail(matches: readonly BreadcrumbMatch[]): Crumb[] {
  const match = matches.findLast((m) => m.staticData.breadcrumb !== undefined)
  const spec = match?.staticData.breadcrumb

  if (!spec) return []

  return typeof spec === "function" ? spec((match.params ?? {}) as Record<string, string>) : spec
}

export function humanizeSlug(slug: string): string {
  const words = slug.replace(/[-_]+/g, " ").trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** Los datos estructurados exigen URLs absolutas; `to`/`pathname` son relativos. */
function absoluteUrl(path: string): string {
  return new URL(path, env.APP_URL).toString()
}

/**
 * `BreadcrumbList` de schema.org para los datos estructurados de Google.
 *
 * Cada item lleva `item` (URL absoluta): en los ancestros la del crumb, en la
 * hoja la URL actual — que es la única forma de resolver rutas con params.
 * Google permite omitir `item` en el último elemento, pero incluirlo es válido
 * y evita que la hoja quede sin URL cuando el crumb no declara `to`.
 *
 * Devuelve `null` si algún ancestro no tiene `to`: un `BreadcrumbList` con
 * huecos en la cadena es peor que no emitir nada (Google lo marca inválido).
 */
export function buildBreadcrumbJsonLd(trail: Crumb[], currentPath: string): string | null {
  if (trail.length === 0) return null

  const itemListElement = trail.map((crumb, index) => {
    const isLast = index === trail.length - 1
    const url = crumb.to ?? (isLast ? currentPath : undefined)

    return url
      ? { "@type": "ListItem", position: index + 1, name: crumb.label, item: absoluteUrl(url) }
      : null
  })

  if (itemListElement.some((item) => item === null)) return null

  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement,
  }).replace(/</g, "\\u003c") // Evita cerrar el <script> desde el contenido.
}
