# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Smoke E2E contra test (gate de release)

Suite Playwright en `e2e/` que corre contra el ambiente **real** de test
(`https://test.pigse.com`, API `/api`, SSO de testv2) — no contra MSW ni
localhost. Es el gate obligatorio antes de tagear un release a producción:
promover a `test`, esperar el deploy y correr la suite en verde.

Hace **escrituras reales** en test (gestión documental). `playwright.config.ts`
se niega a correr contra un host que no sea `test.*` o `localhost`.

### Qué cubre

| Spec | Flujo |
|---|---|
| `smoke.spec.ts` | `<html lang="es" translate="no">` (guarda del traductor); login, menú del backend, cada ruta del menú sin "Algo salió mal" ni "Sin acceso"; logout sin toasts de error |
| `documents.spec.ts` | Por tipo (PEI, PEC, PMI, PFI): abrir el formulario, verificar el documento principal primero, que "Guardar documento" quede bloqueado con un obligatorio faltante, cargar PDFs dummy en todos los obligatorios, guardar y verificar listado/estado. El tipo que no aplica al EE (NO_APLICA) se salta |
| `monitoring.spec.ts` | Tablero de monitoreo y detalle documental con el documento principal primero |
| `employees.spec.ts` | Lista de funcionarios y "restablecer contraseña" a un funcionario de prueba con aviso «Correo enviado a…» |

En **todas** las pruebas se capturan errores de consola, excepciones de la
página y respuestas 4xx/5xx; cualquiera no esperado hace fallar la prueba
(lista de esperados documentada en `e2e/fixtures.ts`).

No se crean funcionarios: crear uno dispara la creación/invitación de la
cuenta SSO por correo. "Restablecer contraseña" solo se envía a correos
`@example.com` (nunca a un correo real).

### Variables de entorno (solo por entorno, nunca en archivos)

| Variable | Obligatoria | Uso |
|---|---|---|
| `PIGSE_TEST_USER` / `PIGSE_TEST_PASS` | sí | Administrador PIGSE (login, rutas, monitoreo, funcionarios) |
| `PIGSE_TEST_RECTOR_USER` / `PIGSE_TEST_RECTOR_PASS` | no | Cuenta **vinculada a un establecimiento de prueba** que se pueda modificar. Gestión documental es por EE propio; sin esta cuenta se saltan las cargas |
| `PIGSE_TEST_RESET_EMAIL` | no | Correo `@example.com` de un funcionario de prueba. Si falta, se busca uno `@example.com` en la primera página; si no hay, la prueba se salta |
| `PIGSE_E2E_BASE_URL` | no | Default `https://test.pigse.com` |

### Correr

```bash
pnpm exec playwright install chromium   # una vez
PIGSE_TEST_USER=... PIGSE_TEST_PASS=... pnpm test:e2e:test-env
pnpm test:e2e:test-env:headed            # viendo el navegador
pnpm test:e2e:report                     # reporte HTML (traces/videos de fallos)
```

En GitHub: Actions → **E2E test env** → *Run workflow*
(`.github/workflows/e2e-test-env.yml`). Necesita los secretos del repo
`PIGSE_TEST_USER` y `PIGSE_TEST_PASS` (y opcionalmente
`PIGSE_TEST_RECTOR_USER`, `PIGSE_TEST_RECTOR_PASS`, `PIGSE_TEST_RESET_EMAIL`).
