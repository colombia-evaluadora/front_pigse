import { useMutation, useQueryClient } from "@tanstack/react-query"

import type { MutationConfig } from "@/lib/react-query"

import { update } from "@/features/establishment/employees/api/mutations/update"
import type { Employee } from "@/features/establishment/employees/api/types/employee"

interface UpdateEmployeeInput {
  employeeId: number
  values: Employee
  /** Foto nueva a subir en el mismo PATCH; omitida, la guardada no se toca. */
  foto?: File | null
}

function updateMutation({ employeeId, values, foto }: UpdateEmployeeInput) {
  return update(employeeId, values, foto)
}

interface UseUpdateOptions {
  mutationConfig?: MutationConfig<typeof updateMutation>
}

export function useUpdate({ mutationConfig }: UseUpdateOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateMutation,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
