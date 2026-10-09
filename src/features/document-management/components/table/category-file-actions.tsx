import { useState } from "react"
import { Link } from "@tanstack/react-router"

import { EyeIcon, FileDownloadOutlinedIcon, SpinnerIcon } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { paths } from "@/config/paths"
import { downloadArchivo } from "@/lib/files"
import { useNotify } from "@/components/notice/notice-context"

import type { DocumentCategory } from "@/features/document-management/api/types/document"

/**
 * "Consultar" (visor) y "Descargar" del archivo vigente de un anexo. Sale del
 * `archivoId`/`downloadUrl` que ya trae `fn_documento_categorias_listar`, así
 * que no hace falta otra consulta. Sin archivo no se muestra nada.
 */
export function CategoryFileActions({ category }: { category: DocumentCategory }) {
  const [descargando, setDescargando] = useState(false)
  const { notify } = useNotify()

  if (category.archivoId == null) return null

  const downloadUrl = category.downloadUrl ?? `/api/files/download/${category.archivoId}`
  const fileName = category.fileName ?? `${category.categoria}.pdf`

  async function handleDownload() {
    setDescargando(true)
    try {
      await downloadArchivo(downloadUrl, fileName)
    } catch (error) {
      notify(error instanceof Error ? error.message : "No se pudo descargar el documento.", {
        variant: "error",
      })
    } finally {
      setDescargando(false)
    }
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        color="neutral"
        size="sm"
        render={
          <Link
            to={paths.app.visor.getHref(category.type)}
            search={{ fileName, archivoId: category.archivoId, downloadUrl, origen: "gestion" }}
          />
        }
        nativeButton={false}
      >
        <EyeIcon data-icon="inline-start" />
        Consultar
      </Button>
      <Button
        variant="ghost"
        color="neutral"
        size="sm"
        type="button"
        disabled={descargando}
        onClick={handleDownload}
      >
        {descargando ? (
          <SpinnerIcon data-icon="inline-start" className="animate-spin" />
        ) : (
          <FileDownloadOutlinedIcon data-icon="inline-start" />
        )}
        Descargar
      </Button>
    </div>
  )
}
