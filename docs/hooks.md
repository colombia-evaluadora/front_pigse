# Convenciones de hooks

## Ubicación

| Capa          | Carpeta                         | Para qué                                                                                                                             |
| ------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Cross-cutting | `src/hooks/`                    | Hooks reutilizables por 2+ features, o agnósticos al dominio (`useDataTable`, `useMobile`, `useTablePagination`, `useFieldVariant`). |
| Por feature   | `src/features/<feature>/hooks/` | Hooks acoplados a la lógica de una feature específica (filtros, conteos, estado de UI particular).                                   |

## Cómo decidir dónde va un hook

1. ¿Lo importan **dos o más features distintas**? → `src/hooks/`.
2. ¿Solo lo usa una feature? → `src/features/<esa>/hooks/`.
3. ¿Es trivial (`useEffect`/`useState` plano de 2-3 líneas) y solo se usa una vez? → queda inline en el componente, sin archivo separado.

Casos en el código:

| Hook                                            | Ubicación actual                                            | Razón                                                                                                                                   |
| ----------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `useDataTable`                                  | `src/hooks/`                                                | Hook del DataTable genérico de TanStack Table.                                                                                          |
| `useTablePagination`                            | `src/hooks/`                                                | Util para envolver `useDataTable` con paginación.                                                                                       |
| `useFieldVariant`                               | `src/hooks/`                                                | Proveedor de variante de field (label flotante vs. tradicional).                                                                        |
| `useMobile`                                     | `src/hooks/`                                                | Hook de `<Sidebar>`/`<Sheet>` (300ms media-query).                                                                                      |
| `useAuth`/`useCountdown`/`usePasswordResetLink` | `features/auth/hooks/`                                      | Lógica exclusiva del login.                                                                                                             |
| `useFilters`                                    | `features/employees/hooks/` y `features/institution/hooks/` | Distintos en cada feature (uno lee `employees/search`, el otro `institution/search`). Hay dos archivos con el mismo nombre a propósito. |

## Patrón de nombre

`use-<verbo-o-sustantivo>` con la primera letra del verbo en minúscula:
`useFilters`, `useMobile`, `useEmployeeRoles`.

Los hooks de mutación de TanStack Query (`useEmployees`, `useCreate`)
viven en `api/mutations/use-*.ts` — **no** van en `hooks/`. Son el
lado hook de la mutación, no lógica de UI.

## Tests

Van al lado, sin subcarpeta `__tests__/`. Ver `docs/tests.md`.
