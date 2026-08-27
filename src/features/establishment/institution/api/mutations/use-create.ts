import { useMutation, useQueryClient } from "@tanstack/react-query"

import { create } from "@/features/establishment/institution/api/mutations/create"
import type { MutationConfig } from "@/lib/react-query"
import type { EstablishmentDetails } from "@/features/establishment/institution/api/types/establishment"

interface CreateEstablishmentInput {
  values: EstablishmentDetails
  /** Escudo. Con archivo, el alta va por `file-service` como multipart. */
  logo?: File | null
}

// `create` toma dos argumentos y `mutationFn` solo pasa uno: se envuelve para
// que las variables de la mutación sean un objeto, igual que en `useUpdate`.
function createEstablishmentMutation({ values, logo }: CreateEstablishmentInput) {
  return create(values, logo)
}

interface UseCreateOptions {
  mutationConfig?: MutationConfig<typeof createEstablishmentMutation>
}

export function useCreate({ mutationConfig }: UseCreateOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createEstablishmentMutation,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["establishments"] })
      queryClient.invalidateQueries({ queryKey: ["establishments", "query"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
