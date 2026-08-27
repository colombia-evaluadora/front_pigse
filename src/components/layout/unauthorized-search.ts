import { z } from "zod"

/**
 * Schema del search-params de la ruta `/app/no-autorizado`. Vive en su
 * propio archivo para romper la dependencia circular entre `router.tsx`
 * (que define la ruta) y `unauthorized-page.tsx` (que la lee): los dos
 * importan de acá en vez de uno del otro.
 *
 * - `from`: pathname del recurso al que el usuario intentó entrar.
 * - `home`: path del primer menú permitido del usuario (alimenta el botón
 *   "Ir a mi inicio").
 */
export const unauthorizedSearchSchema = z.object({
  from: z.string().optional(),
  home: z.string().optional(),
})

export type UnauthorizedSearch = z.infer<typeof unauthorizedSearchSchema>
