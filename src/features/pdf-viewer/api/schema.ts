import { z } from "zod"

/**
 * Search params del visor de PDF.
 *
 * El visor es AGNÓSTICO de dónde lo abrieron: recibe por query todo lo que
 * necesita —el contexto para el título y la referencia al binario— y no
 * consulta ningún listado.
 *
 * Eso no es una optimización, es un requisito. Al visor se llega desde dos
 * lugares con permisos y alcances distintos:
 *
 *   - Gestión documental → el EE del propio usuario (roles RECTOR /
 *     SECRETARIO / ADMINISTRADOR, que sí pueden llamar a `/documentos`).
 *   - Monitoreo y cumplimiento → CUALQUIER EE del tablero (roles
 *     territoriales, que NO están asociados a `/documentos` y reciben
 *     "El catálogo rechazó la consulta").
 *
 * Si el visor resolviera el archivo pidiendo `/documentos`, el segundo caso
 * fallaría por permisos y, aun teniéndolos, devolvería los documentos del EE
 * del usuario en vez de los del que se clickeó.
 *
 * Todos son opcionales: un deep-link incompleto degrada a placeholders en vez
 * de romper.
 */
export const visorSearchSchema = z.object({
  establishmentName: z.string().optional().catch(undefined),
  fileName: z.string().optional().catch(undefined),
  /** `pk_tarchivo` del binario a mostrar. Sin esto no hay nada que abrir. */
  archivoId: z.coerce.number().int().positive().optional().catch(undefined),
  /**
   * Ruta de descarga tal como la arma el backend
   * (`/api/files/download/{archivoId}`). Viaja en vez de construirse acá para
   * que el front no hardcodee la forma de la URL del file-service.
   */
  downloadUrl: z.string().optional().catch(undefined),
})

export type VisorSearch = z.infer<typeof visorSearchSchema>
