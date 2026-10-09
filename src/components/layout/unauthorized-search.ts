import { z } from "zod"

/**
 * Search params de `/app/sin-acceso`. Vive en su propio archivo para que
 * `router.tsx` (que define la ruta) no tenga que importarlos de la página.
 *
 * - `desde`: pathname al que el usuario intentó entrar. Solo
 *   deja rastro en la barra de direcciones (para soporte / QA); la pantalla
 *   no la muestra ni navega a ella.
 *
 * Una URL inválida nunca tira: cae a `undefined`.
 */
export const unauthorizedSearchSchema = z.object({
  desde: z.string().optional().catch(undefined),
})

export type UnauthorizedSearch = z.infer<typeof unauthorizedSearchSchema>
