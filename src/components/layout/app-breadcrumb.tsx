import { Fragment } from "react"
import { Link, useRouterState } from "@tanstack/react-router"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/navigation/breadcrumb"
import { buildBreadcrumbJsonLd, resolveBreadcrumbTrail } from "@/config/breadcrumbs"

/**
 * Migas de pan del layout. El rastro lo declara cada ruta en
 * `staticData.breadcrumb` (ver `@/config/breadcrumbs`).
 *
 * SEO: el marcado ya es semántico (`nav[aria-label] > ol > li`) y además se
 * emite un `BreadcrumbList` de schema.org en JSON-LD. Todos los ancestros son
 * `<a href>` reales — navegables y rastreables; la hoja va como
 * `aria-current="page"` sin enlace, que es lo que espera Google (enlazar la
 * página actual no aporta y molesta a lectores de pantalla).
 *
 * En pantallas chicas solo se ve la última miga: los ancestros se ocultan por
 * CSS, siguen en el DOM y en los datos estructurados.
 */
export function AppBreadcrumb() {
  const trail = useRouterState({
    select: (state) => resolveBreadcrumbTrail(state.matches),
  })
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  if (trail.length === 0) return null

  const jsonLd = buildBreadcrumbJsonLd(trail, pathname)

  return (
    <Breadcrumb className="min-w-0">
      {jsonLd && (
        <script
          type="application/ld+json"
          // El contenido lo genera `buildBreadcrumbJsonLd` vía JSON.stringify,
          // con `<` escapado: no hay forma de romper fuera del script.
          dangerouslySetInnerHTML={{ __html: jsonLd }}
        />
      )}
      <BreadcrumbList className="flex-nowrap justify-center">
        {trail.map((crumb, index) => {
          const isLast = index === trail.length - 1

          return (
            <Fragment key={`${crumb.label}-${index}`}>
              <BreadcrumbItem className={isLast ? "min-w-0" : "hidden sm:inline-flex"}>
                {isLast ? (
                  <BreadcrumbPage className="truncate">{crumb.label}</BreadcrumbPage>
                ) : crumb.to ? (
                  <BreadcrumbLink render={<Link to={crumb.to} />}>{crumb.label}</BreadcrumbLink>
                ) : (
                  // Sin `to` no hay enlace posible: texto, nunca un `<a>` vacío.
                  <span>{crumb.label}</span>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator className="hidden sm:inline-flex" />}
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
