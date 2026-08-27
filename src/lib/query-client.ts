import { QueryClient } from "@tanstack/react-query"

import { queryConfig } from "@/lib/react-query"

export const queryClient = new QueryClient({ defaultOptions: queryConfig })
