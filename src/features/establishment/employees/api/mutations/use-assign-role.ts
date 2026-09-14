import { useMutation, useQueryClient } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"

export interface AssignRoleInput {
  employeeId: number
  roleId: number
}

/**
 * `POST /funcionarios/:ID/rol` -> `pigse.fn_fun_asignar_rol` (V369): fija
 * (reemplaza) el rol del funcionario dentro de su establecimiento actual —
 * PIGSE no tiene un endpoint de "permisos" con rol+jornada+estado como
 * CEVAL (ver V365/V366), así que el rol se asigna aparte del resto de los
 * datos del funcionario (`update.ts`), no dentro del mismo PUT.
 *
 * Sin equivalente real en el mock: el mock de esta app no modela roles por
 * funcionario, así que en modo mock esto no hace nada (resuelve OK sin
 * llamar a ningún handler) — no hay una tabla mock que actualizar.
 */
function assignRole({ employeeId, roleId }: AssignRoleInput): Promise<{ asignado: boolean }> {
  if (env.ENABLE_API_MOCKING) {
    return Promise.resolve({ asignado: true })
  }

  return api.post(`/pigse/funcionarios/${employeeId}/rol`, { fkIdRole: roleId })
}

interface UseAssignRoleOptions {
  mutationConfig?: MutationConfig<typeof assignRole>
}

export function useAssignRole({ mutationConfig }: UseAssignRoleOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: assignRole,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
