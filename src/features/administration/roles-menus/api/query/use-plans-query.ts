import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { pigse } from "@/lib/pigse-client"
import type { MutationConfig } from "@/lib/react-query"

import type { Plan } from "@/features/administration/roles-menus/api/types/role-menu"

function fetchPlans(): Promise<Plan[]> {
  return pigse.getRows<Plan>("/plans")
}

export const plansQueryKey = () => ["plans"]

export function usePlansQuery() {
  return useQuery({
    queryKey: plansQueryKey(),
    queryFn: fetchPlans,
    staleTime: Infinity,
  })
}

function createPlan({ name }: { name: string }): Promise<Plan> {
  return pigse.postRow<Plan>("/plans", { name })
}

export function useCreatePlan({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof createPlan> } = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createPlan,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: plansQueryKey() })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
