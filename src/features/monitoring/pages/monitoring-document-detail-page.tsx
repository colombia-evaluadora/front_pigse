import type { ReactNode } from "react"
import { Link, useCanGoBack, useRouter } from "@tanstack/react-router"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeftIcon, SpinnerIcon, WarningCircleIcon } from "@/components/ui/icons"
import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTabs,
  TableScreenTitle,
} from "@/components/layout/table-screen"
import { NoticeOutlet, NoticeProvider } from "@/components/notice/notice-context"
import { paths } from "@/config/paths"
import { getErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { monitoreoCumplimientoDetalleRoute } from "@/router"

import { useComplianceDetailQuery } from "@/features/monitoring/api/query/use-compliance-detail"
import type {
  ComplianceDocumentDetail,
  DocumentType,
} from "@/features/monitoring/api/types/compliance"
import {
  applicableTypes,
  documentStatusBadge,
  formatDateTime,
  formatRelative,
  formatShortDate,
  plazoBadge,
  shortTypeName,
} from "@/features/monitoring/api/ui-mappings"
import { CategorySection } from "@/features/monitoring/components/detail/category-section"

/**
 * Detalle documental de un establecimiento para un tipo (PEI/PEC/PMI/PFI):
 * lo que el monitor necesita para decidir si reclamar, prorrogar o dar por
 * cumplido -- estado, avance por anexos, plazo efectivo, última carga -- y
 * acceso directo a cada archivo. Reemplaza el salto directo al visor desde
 * el tablero, que en PEI/PEC no tenía archivo que abrir.
 */
export function MonitoringDocumentDetailPage() {
  return (
    <NoticeProvider>
      <MonitoringDocumentDetailContent />
    </NoticeProvider>
  )
}

function MonitoringDocumentDetailContent() {
  const params = monitoreoCumplimientoDetalleRoute.useParams()
  const establishmentId = Number(params.establecimientoId)
  const type = params.tipo as DocumentType
  const { data, isPending, isError, error, refetch } = useComplianceDetailQuery(
    establishmentId,
    type,
  )

  const router = useRouter()
  const canGoBack = useCanGoBack()

  // "Volver" respeta el historial: el tablero guarda filtros y página en la
  // URL, así que volver atrás deja la lista como estaba. Si se entró por un
  // enlace directo no hay a dónde volver y se va al tablero limpio.
  const backButton = (
    <Button
      variant="outline"
      color="neutral"
      size="sm"
      type="button"
      {...(canGoBack
        ? { onClick: () => router.history.back() }
        : {
            render: <Link to={paths.app.monitoreoCumplimiento.getHref()} />,
            nativeButton: false,
          })}
    >
      <ArrowLeftIcon data-icon="inline-start" />
      Volver
    </Button>
  )

  const subtitle = data
    ? [data.establishmentCode ? `DANE ${data.establishmentCode}` : null, data.municipio]
        .filter(Boolean)
        .join(" · ")
    : null

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          description={
            data ? (
              <span className="flex flex-wrap items-center gap-2">
                {subtitle ? <span>{subtitle}</span> : null}
                {data.etnoeducativo ? (
                  <Badge variant="outline" color="secondary">
                    Etnoeducativo
                  </Badge>
                ) : null}
              </span>
            ) : (
              "Documentos institucionales del establecimiento"
            )
          }
          action={backButton}
        >
          {data?.establishmentName ?? "Detalle documental"}
        </TableScreenTitle>

        {data ? (
          <TableScreenTabs>
            <nav aria-label="Documentos del establecimiento" className="flex items-end gap-1">
              {applicableTypes(data.etnoeducativo).map((tab) => (
                <Link
                  key={tab}
                  to={paths.app.monitoreoCumplimientoDetalle.getHref(establishmentId, tab)}
                  replace
                  activeProps={{ "data-active": "true", "aria-current": "page" }}
                  className="-mb-px rounded-t-lg border border-border border-b-border bg-muted/60 px-4 py-1.5 text-sm font-medium text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40 data-active:border-b-card data-active:bg-card data-active:text-foreground"
                >
                  <span className="sm:hidden">{tab}</span>
                  <span className="hidden sm:inline">
                    {tab} · {shortTypeName(tab)}
                  </span>
                </Link>
              ))}
            </nav>
          </TableScreenTabs>
        ) : null}
      </TableScreenHeader>

      <TableScreenBody>
        <NoticeOutlet className="mb-4" />
        {isPending ? (
          <div
            role="status"
            className="flex min-h-64 flex-col items-center justify-center gap-3 text-sm text-muted-foreground"
          >
            <SpinnerIcon className="size-8 animate-spin" aria-hidden />
            Cargando documentos…
          </div>
        ) : isError || !data ? (
          <div
            role="alert"
            className="flex min-h-64 flex-col items-center justify-center gap-3 text-center"
          >
            <WarningCircleIcon className="size-10 text-red" aria-hidden />
            <p className="m-0! max-w-md text-sm text-muted-foreground">
              {error ? getErrorMessage(error) : "No se pudo cargar el detalle documental."}
            </p>
            <Button variant="outline" color="neutral" size="sm" type="button" onClick={() => refetch()}>
              Reintentar
            </Button>
          </div>
        ) : (
          <DetailContent detail={data} establishmentId={establishmentId} />
        )}
      </TableScreenBody>
    </TableScreen>
  )
}

function DetailContent({
  detail,
  establishmentId,
}: {
  detail: ComplianceDocumentDetail
  establishmentId: number
}) {
  const state = {
    status: detail.status,
    estado: detail.estado ?? undefined,
    completedCategories: detail.completedCategories,
    totalCategories: detail.totalCategories,
  }
  const badge = documentStatusBadge(state, detail.plazo)
  const plazo = plazoBadge({
    plazo: detail.plazo,
    tieneExcepcion: detail.tieneExcepcion,
    globalProgress: detail.status === "COMPLETO" ? 100 : 0,
  })
  const done = detail.completedCategories ?? 0
  const total = detail.totalCategories ?? 0
  const percent = detail.status === "COMPLETO" ? 100 : total > 0 ? Math.round((done / total) * 100) : 0
  const obligatorias = detail.categorias.filter((categoria) => categoria.obligatoria)
  const opcionales = detail.categorias.filter((categoria) => !categoria.obligatoria)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="m-0! text-base font-semibold">{detail.typeName}</h2>
      </div>

      <dl className="m-0! grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryItem label="Estado">
          <Badge variant="soft" color={badge.color} title={badge.description}>
            {badge.label}
          </Badge>
        </SummaryItem>
        <SummaryItem label="Anexos obligatorios">
          <div className="flex w-full items-center gap-2">
            <div
              role="progressbar"
              aria-label="Anexos obligatorios cargados"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={done}
              className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
            >
              <div
                className={cn(
                  "h-full rounded-full",
                  percent === 100 ? "bg-green" : percent > 0 ? "bg-yellow" : "bg-red",
                )}
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="text-sm font-semibold tabular-nums">
              {done}/{total}
            </span>
          </div>
        </SummaryItem>
        <SummaryItem label="Fecha límite">
          {detail.fechaLimite ? (
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium tabular-nums">
                {formatShortDate(detail.fechaLimite)}
              </span>
              {plazo ? (
                <Badge variant="soft" color={plazo.color} title={plazo.description}>
                  {plazo.label}
                </Badge>
              ) : null}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">Sin fecha límite</span>
          )}
        </SummaryItem>
        <SummaryItem label="Última carga">
          {detail.lastUploadedAt ? (
            <time
              dateTime={detail.lastUploadedAt}
              title={formatDateTime(detail.lastUploadedAt)}
              className="text-sm font-medium"
            >
              {formatRelative(detail.lastUploadedAt)}
            </time>
          ) : (
            <span className="text-sm text-muted-foreground">Sin cargas</span>
          )}
        </SummaryItem>
      </dl>

      <div className="flex flex-col gap-5">
        {obligatorias.map((categoria) => (
          <CategorySection
            key={categoria.categoria}
            category={categoria}
            type={detail.type}
            establishmentId={establishmentId}
            establishmentName={detail.establishmentName}
          />
        ))}
        {opcionales.length ? (
          <>
            <hr className="border-border" />
            {opcionales.map((categoria) => (
              <CategorySection
                key={categoria.categoria}
                category={categoria}
                type={detail.type}
                establishmentId={establishmentId}
                establishmentName={detail.establishmentName}
              />
            ))}
          </>
        ) : null}
      </div>
    </div>
  )
}

function SummaryItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-20 flex-col justify-between gap-2 rounded-md border border-border p-3">
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="m-0! flex items-center">{children}</dd>
    </div>
  )
}
