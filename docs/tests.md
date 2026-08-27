# Convenciones de tests

## Ubicación

**Colocation.** Cada archivo bajo prueba tiene su `.test.ts` al lado, con
el mismo nombre base:

```
src/features/establishment/institution/api/mutations/use-create.ts
src/features/establishment/institution/api/mutations/use-create.test.ts
```

Vitest descubre automáticamente cualquier `**/*.test.{ts,tsx}`. No hace
falta registrar nada.

## Por qué colocation y no `__tests__/` o `tests/`

- **Lo que se rompe junto vive junto.** Un cambio en `use-create.ts` deja
  su test al lado — el grep de TS los ve en el mismo listado sin tener
  que cruzar de carpeta.
- **Favorece el "test-first".** Cuando agregás una función nueva, el
  archivo de test ya está en la carpeta: solo tenés que abrir el IDE
  al lado, no navegar a un directorio hermano.
- **Cobertura legible.** `git diff --stat src/features/...` muestra el
  `*.test.ts` al lado del `*.ts` que cambió — la cobertura es una
  consecuencia natural del commit, no algo que se trackea aparte.

## Formato del archivo

Un test por archivo se ve así (ver `use-create.test.ts`):

```ts
import { describe, it, expect } from "vitest"

import { useCreate } from "./use-create"

describe("useCreate", () => {
  it("...", () => {
    expect(...)
  })
})
```

Para tests que necesitan mockear el cliente HTTP (`api`/`useArchivoViewUrl`/etc.),
se usa `vi.mock("@/lib/api-client", ...)`. El helper está en
`src/test-utils/` cuando varios tests lo necesitan.

## Cuándo testear

- **Sí**: lógica con reglas (RBAC en `lib/auth-routes.ts`, `parseo` de
  query strings en `query-syntax.ts`, validadores de formulario).
- **Sí**: hooks con mutaciones (los mocks verifican que `onSuccess`
  dispara correctamente).
- **No obligatorio**: componentes que solo orquestan UI sin lógica —
  preferible probar con Storybook + Chromatic.

## Vitest

Config en `vite.config.ts` (proyecto `storybook`). Para correr sólo los
unit tests:

```sh
pnpm vitest run
```
