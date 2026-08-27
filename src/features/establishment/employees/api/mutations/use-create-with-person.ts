import { useMutation } from "@tanstack/react-query"

import type { MutationConfig } from "@/lib/react-query"

import { createWithPerson } from "@/features/establishment/employees/api/mutations/create-with-person"

interface UseCreateWithPersonOptions {
  mutationConfig?: MutationConfig<typeof createWithPerson>
}

export function useCreateWithPerson({ mutationConfig }: UseCreateWithPersonOptions = {}) {
  return useMutation({
    mutationFn: createWithPerson,
    ...mutationConfig,
  })
}
