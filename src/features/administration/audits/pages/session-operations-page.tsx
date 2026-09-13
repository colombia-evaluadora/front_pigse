import { CheckIcon, XIcon } from "@/components/ui/icons"
import { Link, useParams } from "@tanstack/react-router"

import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { paths } from "@/config/paths"

import { useAuditSessionQuery } from "@/features/administration/audits/api/query/use-audit-session-query"
import { useAuditSessionStatusesQuery } from "@/features/administration/audits/api/query/use-audit-session-statuses-query"
import { SESSION_STATUS_BADGE } from "@/features/administration/audits/api/ui-mappings"
import { SessionOperationsDataTable } from "@/features/administration/audits/components/table/session-operations-table"

export function SessionOperationsPage() {
  const { sessionId } = useParams({ strict: false }) as { sessionId: string }

  const { data: session, isPending, isError } = useAuditSessionQuery({ sessionId })

  // El label del estado lo entrega el backend (`{ key, label }`). Si la
  // query todavía no llegó, caemos al `key` como fallback.
  const { data: statusOptions = [] } = useAuditSessionStatusesQuery()
  const statusLabel = session
    ? (statusOptions.find((o) => o.key === session.status)?.label ?? session.status)
    : null

  const initials = session
    ? session.authorName
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() ?? "")
        .join("")
    : ""


  const title = isPending ? (
    <div className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
      <Spinner /> Cargando sesión…
    </div>
  ) : isError || !session ? (
    "Sesión no encontrada"
  ) : (
    <div className="flex flex-wrap items-center gap-2">
      <Avatar>
        {session.authorAvatarUrl && <AvatarImage src={session.authorAvatarUrl} alt="" />}
        <AvatarFallback>{initials}</AvatarFallback>
        {session.authorVerified && (
          <AvatarBadge>
            <CheckIcon weight="bold" />
          </AvatarBadge>
        )}
      </Avatar>
      {session.authorName}
      <Badge variant="soft" color="muted">
        {session.ip}
      </Badge>
      <Badge {...SESSION_STATUS_BADGE[session.status]}>{statusLabel}</Badge>
    </div>
  )


  return (
    // El encabezado sticky y el cuerpo son dos Cards independientes, NO se
    // encapsulan en una misma Card aquí — eso lo hace internamente
    // `SessionOperationsDataTable` para que el body y su data-fetching
    // compartan el ciclo de vida.
    <SessionOperationsDataTable
      sessionId={sessionId}
      title={title}
      action={
        <Button
          variant="fill"
          color="neutral"
          size="sm"
          render={<Link to={paths.app.auditoriaSesiones.getHref()} />}
          nativeButton={false}
        >
          <XIcon data-icon="inline-start" />
          Cerrar
        </Button>
      }
    />
  )
}
