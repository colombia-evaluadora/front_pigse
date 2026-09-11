import type { ReactNode } from "react"

import { NoticeOutlet } from "@/components/notice/notice-context"
import { cn } from "@/lib/utils"

/**
 * Andamiaje de las pantallas de listado: encabezado pegajoso (título + barra de
 * herramientas) y cuerpo con la tabla y su paginación.
 *
 * Son piezas que se COMPONEN por anidamiento, no un componente con props
 * `title`/`toolbar`/`actions`: las pantallas que se salen del molde (las de
 * auditoría llevan pestañas, roles y menús pone un selector en la barra en vez
 * de un buscador) se resuelven agregando o quitando piezas, sin banderas.
 *
 * No usa `Card`: la card es una superficie genérica y acá la estructura tiene
 * significado —encabezado de la página, título de la página, contenido—, así
 * que se marca con `<header>`, `<h1>` y `<section>`. Los estilos de superficie
 * (fondo, radio, anillo) van sueltos, copiados de `Card`.
 *
 * El `<main>` lo pone `SidebarInset` en `ProtectedLayout`, así que el `<h1>`
 * de cada pantalla ya cuelga de él; no hay que anidar otro.
 *
 * @example
 *   <TableScreen>
 *     <TableScreenHeader>
 *       <TableScreenTitle>Establecimiento educativo</TableScreenTitle>
 *       <TableScreenToolbar>
 *         <SearchEstablishments … />
 *         <TableScreenActions>{action}</TableScreenActions>
 *       </TableScreenToolbar>
 *     </TableScreenHeader>
 *     <TableScreenBody>
 *       <DataTable … />
 *       <Pagination … />
 *     </TableScreenBody>
 *   </TableScreen>
 */
function TableScreen({ children, className }: { children: ReactNode; className?: string }) {
  // `--screen-spacing` es el equivalente al `--card-spacing` de `Card`: lo
  // declara el contenedor y lo consumen las piezas para que el padding
  // horizontal sea el mismo en encabezado, pestañas y cuerpo.
  //
  // `flex-1 flex-col` replica el contenedor del layout para que el cuerpo
  // pueda estirarse (`grow`) hasta el borde inferior con tablas cortas.
  return (
    <section
      className={cn("flex min-w-0 flex-1 flex-col [--screen-spacing:--spacing(4)]", className)}
    >
      {children}
    </section>
  )
}

/**
 * Encabezado de la pantalla. Queda pegado bajo el header de la app (`top-14`
 * = su alto): el `bg-sidebar` opaco tapa lo que scrollea por debajo.
 *
 * Es su PROPIA superficie, separada del cuerpo —tiene que serlo: el `sticky`
 * vive acá y el cuerpo scrollea por debajo—. Por eso el contorno se pinta con
 * `border` y no con `ring`: el borde se puede quitar de un solo lado
 * (`border-b-0`) y así el encuentro con el cuerpo no muestra las dos líneas de
 * 1px, una de cada superficie, que se veían como una costura en el medio.
 */
function TableScreenHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <header className={cn("sticky top-14 z-20 bg-sidebar", className)}>
      {/* Sin barra de herramientas el encabezado es solo el título, que ya
          cierra con su propio `border-b`: ahí el `hr` daba línea doble, así que
          se esconde cuando no hay `TableScreenToolbar` dentro. */}
      <div className="overflow-hidden rounded-t-lg border border-b-0 border-border bg-card text-sm text-card-foreground not-has-[[data-slot=table-screen-toolbar]]:[&>hr]:hidden">
        {children}
        {/* Cierre del encabezado. Va acá dentro —y no como borde del cuerpo—
            para que viaje con el `sticky`: la línea se queda arriba mientras el
            contenido pasa por debajo. El `mx` es el mismo `--screen-spacing`
            que el padding de las piezas, así que arranca y termina donde el
            texto, no de borde a borde. */}
        <hr className="mx-(--screen-spacing) border-border" />
      </div>
    </header>
  )
}

/**
 * Título de la pantalla. Es el `<h1>` del documento: uno solo por página.
 *
 * `description` es la bajada opcional: una línea que explica de qué va la
 * pantalla, para las que no se entienden solas con el título (roles y menús).
 * Los listados que sí se explican con el título la omiten.
 *
 * `action` es para lo que acompaña al título en su misma línea (ej. el "Volver"
 * de las operaciones de auditoría). Las acciones sobre la tabla —agregar,
 * exportar— no van acá sino en `TableScreenActions`, junto al buscador.
 */
function TableScreenTitle({
  children,
  description,
  action,
  className,
}: {
  children: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 border-b border-border bg-table-screen-title px-(--screen-spacing) py-4",
        className,
      )}
    >
      {/* `min-w-0` para que la bajada larga corte contra la acción en vez de
          empujarla fuera de la fila. */}
      <div className="min-w-0">
        <h1 className="font-heading text-2xl font-bold">{children}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}

/**
 * Franja de pestañas entre el título y la barra de herramientas (las vistas de
 * auditoría). El contenido esperado es un `<nav>` con los enlaces.
 */
function TableScreenTabs({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("border-b border-border px-(--screen-spacing) pt-4", className)}>
      {children}
    </div>
  )
}

/**
 * Barra de herramientas: buscador a la izquierda, acciones a la derecha.
 *
 * `items-end` porque el buscador es más alto que los botones (lleva etiqueta
 * flotante) y todos tienen que compartir la línea base de abajo.
 *
 * Debajo va el `NoticeOutlet` de la pantalla: los avisos (errores de una
 * mutación, confirmaciones) salen siempre acá, entre la barra y la tabla.
 */
function TableScreenToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    // El `data-slot` es lo que mira el encabezado para decidir si dibuja su
    // línea de cierre; sin barra, el borde del título ya cierra.
    <div data-slot="table-screen-toolbar" className={cn("px-(--screen-spacing) py-4", className)}>
      <div className="flex flex-wrap items-end justify-between gap-4">{children}</div>
      <NoticeOutlet className="mt-3" />
    </div>
  )
}

/** Bloque de acciones de la barra de herramientas (agregar, exportar, ...). */
function TableScreenActions({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex items-center gap-2", className)}>{children}</div>
}

/**
 * Barra de acciones pegada al borde inferior. Espejo de `TableScreenHeader`:
 * el `sticky` lo lleva un contenedor con `bg-sidebar` opaco —que tapa lo que
 * scrollea por debajo— y adentro va la superficie, para que la barra quede
 * DENTRO de la página y no como una franja suelta de borde a borde.
 *
 * La usan las pantallas de formulario (agregar/editar), donde el guardar tiene
 * que estar siempre a la vista; los listados no la montan. Cuando está, el
 * cuerpo pierde su radio inferior: `<TableScreenBody className="rounded-b-none">`.
 */
function TableScreenFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <footer className={cn("sticky bottom-0 z-30 bg-sidebar", className)}>
      {/* Una sola línea arriba: la del propio contorno, que acá hace de
          separador con el cuerpo (por eso el cuerpo se monta con `border-b-0`
          cuando hay footer). */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-b-lg border border-border bg-background px-(--screen-spacing) py-4 text-sm text-card-foreground">
        {children}
      </div>
    </footer>
  )
}

/**
 * Cuerpo: la tabla y su paginación. `overflow-visible` para no romper el
 * sticky del encabezado; sin borde arriba porque lo pone el encabezado, y sin
 * radio superior para pegarse a su base plana.
 *
 * Cuando debajo va un `TableScreenFooter`, también pierde el de abajo:
 * `<TableScreenBody className="rounded-b-none border-b-0">`.
 */
function TableScreenBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "grow overflow-visible rounded-b-lg border border-t-0 border-border bg-card py-4 text-sm text-card-foreground",
        className,
      )}
    >
      <div className="px-(--screen-spacing)">{children}</div>
    </div>
  )
}

export {
  TableScreen,
  TableScreenActions,
  TableScreenBody,
  TableScreenFooter,
  TableScreenHeader,
  TableScreenTabs,
  TableScreenTitle,
  TableScreenToolbar,
}
