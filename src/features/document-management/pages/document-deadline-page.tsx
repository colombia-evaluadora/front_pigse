import { useState } from "react"

import { NoticeProvider, useNotify } from "@/components/notice/notice-context"
import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
} from "@/components/layout/table-screen"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { DatePicker } from "@/components/date-picker"
import { PlusIcon, SpinnerIcon, TrashIcon, XIcon } from "@/components/ui/icons"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
} from "@/components/ui/combobox"
import { Skeleton } from "@/components/ui/skeleton"
import { getErrorMessage } from "@/lib/api-client"
import { useUser } from "@/lib/auth"
import { canWriteDocumentDeadline } from "@/lib/auth-routes"
import { toSelectItemsMap } from "@/lib/catalog-options"
import { formatDateValue, parseDateValue } from "@/lib/date-value"

import { useDocumentDeadlineQuery } from "@/features/document-management/api/query/use-document-deadline"
import { useUpdateDocumentDeadline } from "@/features/document-management/api/mutations/use-update-document-deadline"
import { useSaveDocumentDeadlineException } from "@/features/document-management/api/mutations/use-save-document-deadline-exception"
import { useDeleteDocumentDeadlineException } from "@/features/document-management/api/mutations/use-delete-document-deadline-exception"
import { useEstablishmentsOptionsQuery } from "@/features/establishment/institution/api/query/use-establishments-options"

/**
 * Configuración de la fecha límite global de "Gestión documental" (V522):
 * Secretaria Territorial (o Administrador) fija una fecha global —
 * después de esa fecha ningún establecimiento puede subir NI eliminar
 * documentos — y puede darle a un establecimiento puntual su PROPIA fecha
 * (reemplaza la global para él, no la suma).
 *
 * Mismo criterio que `roles-menus-page.tsx`: `NoticeProvider` en el
 * componente exportado, no en el que consume `useNotify` (si no, cae al
 * toast suelto en vez del aviso de la pantalla).
 */
export function DocumentDeadlinePage() {
  return (
    <NoticeProvider>
      <DocumentDeadlinePageContent />
    </NoticeProvider>
  )
}

function DocumentDeadlinePageContent() {
  const { notify } = useNotify()
  const { data, isPending } = useDocumentDeadlineQuery()
  const userQuery = useUser()
  const isReadOnly = !canWriteDocumentDeadline(userQuery.data)

  const [draftFecha, setDraftFecha] = useState<Date | undefined>()
  const [fechaTouched, setFechaTouched] = useState(false)
  const fechaActual = fechaTouched ? draftFecha : parseDateValue(data?.fechaLimite ?? "")

  const updateDeadline = useUpdateDocumentDeadline({
    mutationConfig: {
      onSuccess: () => {
        notify("La fecha límite global se actualizó correctamente.")
        setFechaTouched(false)
      },
      onError: (error) => notify(getErrorMessage(error), { variant: "error" }),
    },
  })

  function handleGuardarFecha() {
    updateDeadline.mutate(fechaActual ? formatDateValue(fechaActual) : null)
  }

  function handleQuitarFecha() {
    updateDeadline.mutate(null)
  }

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle description="Después de la fecha límite, ningún establecimiento puede subir ni eliminar documentos -- salvo el que tenga su propia excepción.">
          Fecha límite de Gestión documental
        </TableScreenTitle>
      </TableScreenHeader>

      <TableScreenBody>
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">Fecha límite global</h3>
            {isPending ? (
              <Skeleton className="h-10 w-64" />
            ) : (
              <div className="flex flex-wrap items-end gap-3">
                <Field variant="outlined" className="w-64">
                  <FieldLabel htmlFor="fecha-limite-global">Fecha límite</FieldLabel>
                  <DatePicker
                    id="fecha-limite-global"
                    variant="outlined"
                    disabled={isReadOnly}
                    value={fechaActual}
                    onChange={(value) => {
                      setDraftFecha(value)
                      setFechaTouched(true)
                    }}
                  />
                </Field>
                {!isReadOnly && (
                  <>
                    <Button
                      type="button"
                      color="primary"
                      variant="fill"
                      size="sm"
                      disabled={updateDeadline.isPending}
                      onClick={handleGuardarFecha}
                    >
                      {updateDeadline.isPending ? (
                        <SpinnerIcon data-icon="inline-start" className="animate-spin" />
                      ) : null}
                      Guardar
                    </Button>
                    {data?.fechaLimite ? (
                      <Button
                        type="button"
                        color="neutral"
                        variant="outline"
                        size="sm"
                        disabled={updateDeadline.isPending}
                        onClick={handleQuitarFecha}
                      >
                        <XIcon data-icon="inline-start" />
                        Quitar fecha límite
                      </Button>
                    ) : null}
                  </>
                )}
              </div>
            )}
          </div>

          <DocumentDeadlineExceptions
            exceptions={data?.excepciones ?? []}
            isPending={isPending}
            isReadOnly={isReadOnly}
          />
        </div>
      </TableScreenBody>
    </TableScreen>
  )
}

function DocumentDeadlineExceptions({
  exceptions,
  isPending,
  isReadOnly,
}: {
  exceptions: { establecimientoId: number; establecimientoNombre: string; fechaLimite: string }[]
  isPending: boolean
  isReadOnly: boolean
}) {
  const { notify } = useNotify()
  const { data: establishments = [] } = useEstablishmentsOptionsQuery()

  const [addingEstablishmentId, setAddingEstablishmentId] = useState<number | null>(null)
  const [addingFecha, setAddingFecha] = useState<Date | undefined>()

  const saveException = useSaveDocumentDeadlineException({
    mutationConfig: {
      onSuccess: () => {
        notify("La excepción se guardó correctamente.")
        setAddingEstablishmentId(null)
        setAddingFecha(undefined)
      },
      onError: (error) => notify(getErrorMessage(error), { variant: "error" }),
    },
  })

  const deleteException = useDeleteDocumentDeadlineException({
    mutationConfig: {
      onSuccess: () => notify("La excepción se eliminó correctamente."),
      onError: (error) => notify(getErrorMessage(error), { variant: "error" }),
    },
  })

  // Un establecimiento con excepción activa no vuelve a aparecer en el
  // selector: ya tiene una, para cambiarla se edita/quita la que tiene.
  const establishmentsWithoutException = establishments.filter(
    (establishment) => !exceptions.some((e) => e.establecimientoId === establishment.id),
  )

  function handleAgregar() {
    if (addingEstablishmentId == null || !addingFecha) return
    saveException.mutate({
      establecimientoId: addingEstablishmentId,
      fechaLimite: formatDateValue(addingFecha),
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">Excepciones por establecimiento</h3>
      <p className="text-muted-foreground text-sm">
        Un establecimiento con excepción se rige por SU fecha, no por la global.
      </p>

      {isPending ? (
        <Skeleton className="h-40" />
      ) : (
        <div className="flex flex-col gap-2 rounded-md border border-border">
          {exceptions.length === 0 ? (
            <p className="text-muted-foreground p-4 text-sm">
              Ningún establecimiento tiene excepción configurada.
            </p>
          ) : (
            exceptions.map((exception) => (
              <div
                key={exception.establecimientoId}
                className="flex items-center justify-between gap-3 border-b border-border p-3 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="m-0! truncate text-sm font-medium">
                    {exception.establecimientoNombre}
                  </p>
                  <p className="m-0! text-xs text-muted-foreground">
                    Fecha límite: {exception.fechaLimite}
                  </p>
                </div>
                {!isReadOnly && (
                  <Button
                    type="button"
                    variant="outline"
                    color="neutral"
                    size="sm"
                    disabled={deleteException.isPending}
                    onClick={() => deleteException.mutate(exception.establecimientoId)}
                  >
                    <TrashIcon data-icon="inline-start" />
                    Quitar
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {!isReadOnly && (
        <div className="flex flex-wrap items-end gap-3">
          <Field variant="outlined" className="w-72">
            <FieldLabel htmlFor="excepcion-establecimiento">Establecimiento</FieldLabel>
            <ComboboxField
              items={toSelectItemsMap(
                establishmentsWithoutException.map((e) => ({ value: String(e.id), label: e.name })),
              )}
              value={addingEstablishmentId != null ? String(addingEstablishmentId) : ""}
              onValueChange={(value) => setAddingEstablishmentId(value ? Number(value) : null)}
            >
              <ComboboxFieldTrigger id="excepcion-establecimiento" size="sm" className="w-full">
                <ComboboxFieldValue placeholder="Elegir establecimiento" />
              </ComboboxFieldTrigger>
              <ComboboxFieldContent>
                {establishmentsWithoutException.map((establishment) => (
                  <ComboboxFieldItem key={establishment.id} value={String(establishment.id)}>
                    {establishment.name}
                  </ComboboxFieldItem>
                ))}
              </ComboboxFieldContent>
            </ComboboxField>
          </Field>

          <Field variant="outlined" className="w-48">
            <FieldLabel htmlFor="excepcion-fecha">Fecha límite</FieldLabel>
            <DatePicker
              id="excepcion-fecha"
              variant="outlined"
              value={addingFecha}
              onChange={setAddingFecha}
            />
          </Field>

          <Button
            type="button"
            color="primary"
            variant="fill"
            size="sm"
            disabled={addingEstablishmentId == null || !addingFecha || saveException.isPending}
            onClick={handleAgregar}
          >
            {saveException.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <PlusIcon data-icon="inline-start" />
            )}
            Agregar excepción
          </Button>
        </div>
      )}
    </div>
  )
}
