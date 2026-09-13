"use no memo"

import { Link } from "@tanstack/react-router"

import { Pagination } from "@/components/pagination"
import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTabs,
  TableScreenTitle,
  TableScreenToolbar,
} from "@/components/layout/table-screen"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { getNavIcon } from "@/features/navigation/api/ui-mappings"
import { paths } from "@/config/paths"

import { FilterAuditTablesForm } from "@/features/administration/audits/components/forms/form-filter-audit-tables"
import { useAuditTablesFilters } from "@/features/administration/audits/hooks/use-audit-tables-filters"
import { useAuditTablesQuery } from "@/features/administration/audits/api/query/use-audit-tables-query"

const FILTER_AUDIT_TABLES_FORM_ID = "filter-audit-tables-form"

const viewLinks = [
  { label: "Por sesión", to: paths.app.auditoriaSesiones.getHref() },
  { label: "Por tablas", to: paths.app.auditoriaTablas.getHref() },
]

export function AuditTablesDataTable() {
  const { pageIndex, pageSize, goToPage, setPageSize } = useTablePagination()
  const { filters, queryFilters, applyFilters } = useAuditTablesFilters()
  const { data, isPending, isError, refetch } = useAuditTablesQuery({
    filters: queryFilters,
    sorting: [],
    pageIndex,
    pageSize,
  })

  if (isPending) {
    return (
      <TableScreen>
        <TableScreenHeader>
          <TableScreenTitle>Tablas de auditoría</TableScreenTitle>
          <TableScreenTabs>
            <nav aria-label="Vistas de auditoría" className="flex items-end gap-1">
              {viewLinks.map((view) => (
                <Link
                  key={view.to}
                  to={view.to}
                  activeProps={{ "data-active": "true" }}
                  className="-mb-px rounded-t-lg border border-border border-b-border bg-muted/60 px-4 py-1.5 text-sm font-medium text-muted-foreground data-active:border-b-card data-active:bg-card data-active:text-foreground"
                >
                  {view.label}
                </Link>
              ))}
            </nav>
          </TableScreenTabs>
          <TableScreenToolbar>
            <Skeleton className="h-10 w-72" />
          </TableScreenToolbar>
        </TableScreenHeader>

        <TableScreenBody>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} size="sm">
                <CardContent className="flex flex-col gap-3">
                  <Skeleton className="size-10 rounded-lg" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        </TableScreenBody>
      </TableScreen>
    )
  }

  if (isError) {
    return (
      <p className="text-sm text-muted-foreground">
        Ocurrió un error al cargar las tablas.{" "}
        <button
          type="button"
          onClick={() => refetch()}
          className="underline underline-offset-4 hover:text-foreground"
        >
          Reintentar
        </button>
      </p>
    )
  }

  const rows = data?.rows ?? []
  const totalCount = data?.totalCount ?? 0
  const pageCount = data?.pageCount ?? 1

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle>Tablas de auditoría</TableScreenTitle>
        <TableScreenTabs>
          <nav aria-label="Vistas de auditoría" className="flex items-end gap-1">
            {viewLinks.map((view) => (
              <Link
                key={view.to}
                to={view.to}
                activeProps={{ "data-active": "true" }}
                className="-mb-px rounded-t-lg border border-border border-b-border bg-muted/60 px-4 py-1.5 text-sm font-medium text-muted-foreground data-active:border-b-card data-active:bg-card data-active:text-foreground"
              >
                {view.label}
              </Link>
            ))}
          </nav>
        </TableScreenTabs>
        <TableScreenToolbar>
          <FilterAuditTablesForm
            id={FILTER_AUDIT_TABLES_FORM_ID}
            defaultValues={filters}
            onSubmit={applyFilters}
          />
        </TableScreenToolbar>
      </TableScreenHeader>

      <TableScreenBody>
        {totalCount === 0 ? (
          <p className="text-sm text-muted-foreground">
            {filters.name
              ? `Sin tablas que coincidan con "${filters.name}".`
              : "Sin tablas para mostrar."}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {rows.map((table) => {
                const Icon = getNavIcon(table.icon)
                return (
                  <Link key={table.slug} to={paths.app.auditoriaTablaDetalle.getHref(table.slug)}>
                    <Card size="sm" className="h-full transition-colors hover:bg-muted/50">
                      <CardContent className="flex flex-col gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Icon weight="fill" className="size-5" />
                        </span>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold">{table.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {table.operationsToday} operaciones
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
            <Pagination
              pageIndex={pageIndex}
              pageCount={pageCount}
              canPrev={pageIndex > 0}
              canNext={pageIndex < pageCount - 1}
              onPageChange={goToPage}
              totalCount={totalCount}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </TableScreenBody>
    </TableScreen>
  )
}
