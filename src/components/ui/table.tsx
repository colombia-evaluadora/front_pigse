"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function Table({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<"table"> & {
  /**
   * Clases para el contenedor con el scroll, no para el `<table>`. Es por donde
   * se le pone alto máximo (`max-h-… overflow-y-auto`): quien lo envuelva en
   * otra caja para eso termina con dos bordes, porque el borde y el radio ya
   * viven acá.
   */
  containerClassName?: string
}) {
  return (
    // El contenedor es el que lleva borde y radio: el `<table>` no puede
    // redondear sus esquinas (las pintan las celdas), y el `overflow` que ya
    // necesitaba para el scroll horizontal recorta las filas contra la curva.
    <div
      data-slot="table-container"
      className={cn(
        "scrollbar-slim relative w-full overflow-x-auto rounded-lg border border-border",
        containerClassName,
      )}
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead data-slot="table-header" className={cn("[&_tr]:border-b", className)} {...props} />
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        // `muted-22` (muted con ~28% de alfa) y no `muted/50`: el hover de
        // la fila era demasiado marcado y competía con la fila seleccionada,
        // que sí usa el muted sólido.
        "border-b transition-colors hover:bg-muted-22 has-aria-expanded:bg-muted-22 data-[state=selected]:bg-muted",
        className,
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        // `text-sm`: el encabezado usa el MISMO tamaño que las celdas del
        // cuerpo (lo hereda de `<table class="text-sm">`), no una escala menor.
        // `px-4` y no `px-3`: el botón del encabezado ordenable va con `-ml-3`
        // para alinear su texto con el de las celdas, así que con `px-3` su
        // fondo quedaba a ras del borde de la tabla en la primera columna.
        "h-12 px-4 text-left align-middle text-sm font-medium tracking-wider whitespace-nowrap text-muted-foreground uppercase [&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        // Los badges de la base son de 10px, que dentro de una tabla quedan
        // muy por debajo del texto de las celdas. Se suben a 12px acá y no en
        // el componente para no tocar su uso fuera de tablas.
        // `py-3` aparte del `px-4` para no tocar el alto de fila.
        "px-4 py-3 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&_[data-slot=badge]]:text-xs",
        className,
      )}
      {...props}
    />
  )
}

function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption }
