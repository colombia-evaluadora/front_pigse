#!/usr/bin/env bash
#
# setup-environment-secrets.sh — puebla los secretos y variables de un GitHub
# Environment (`test` o `production`) para el pipeline de despliegue.
#
# Portado de `colombia-evaluadora/SSO`, adaptado a Cloudflare Workers.
#
# ─── Por qué existe ──────────────────────────────────────────────────
#
# Con secretos a nivel de REPOSITORIO habría que atarlos a un entorno en el
# nombre (TEST_CF_TOKEN, PROD_CF_TOKEN…) y duplicar la lógica del workflow.
# Con secretos por ENVIRONMENT los NOMBRES son los mismos y lo que cambia es
# el VALOR, de modo que un único workflow reutilizable (`deploy.yml`) sirve
# para los dos destinos sin saber a cuál apunta.
#
# ─── Lo que crea ─────────────────────────────────────────────────────
#
# SECRETO DE ENTORNO (cifrado, enmascarado en los logs):
#   ENV_FILE               contenido completo del .env de build
#
# Es el UNICO que va por entorno, porque es el unico cuyo VALOR cambia: en
# `dev` lleva ENABLE_API_MOCKING=active, en test/production apunta a su
# backend.
#
# CLOUDFLARE_API_TOKEN y CLOUDFLARE_ACCOUNT_ID NO se configuran aca: van
# como secretos de REPOSITORIO, porque los tres Workers viven en la misma
# cuenta de Cloudflare y el valor es identico. Por entorno serian seis
# copias del mismo secreto sin ganar aislamiento. Se cargan una sola vez:
#
#   gh secret set CLOUDFLARE_API_TOKEN  --repo <repo>
#   gh secret set CLOUDFLARE_ACCOUNT_ID --repo <repo>
#
# VARIABLES (visibles en los logs — son configuración, no credenciales):
#   API_PROXY_TARGET       backend al que el Worker reenvía /api/*. Opcional:
#                          si no está, manda el valor de `env.<entorno>.vars`
#                          de wrangler.jsonc.
#
# El NOMBRE del Worker y su custom domain NO se configuran acá: viven en
# `env.test` / `env.production` de wrangler.jsonc (el dominio tiene que
# declararse ahí para que wrangler lo provisione con `custom_domain: true`).
#
# ─── AVISO sobre ENV_FILE ────────────────────────────────────────────
#
# A diferencia del SSO —donde ENV_FILE es el .env de runtime del servidor y
# nunca sale de la máquina— acá es el .env de BUILD de Vite: todo lo que
# empiece por VITE_APP_ queda escrito LITERALMENTE dentro del JavaScript que
# se sirve al navegador. Cualquiera puede leerlo con devtools.
#
#   → NO pongas tokens ni claves acá. Los secretos de verdad viven en el
#     backend, detrás del gateway.
#
# Se guarda como secreto de GitHub por higiene (no ensuciar el repo con URLs
# de infraestructura), no porque sea confidencial.
#
# ─── Uso ─────────────────────────────────────────────────────────────
#
#   ./scripts/setup-environment-secrets.sh dev \
#       --api-proxy-target http://172-233-184-248.ip.linodeusercontent.com:8080 \
#       --env-file ./.env.dev
#
# Ningún valor sensible viaja como argumento: los argumentos son visibles en
# `ps` y quedan en el historial del shell.
#
set -euo pipefail

REPO="${REPO:-colombia-evaluadora/front_pigse}"

ENTORNO="${1:-}"
shift || true

API_PROXY_TARGET=""
ENV_FILE_PATH=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --api-proxy-target)  API_PROXY_TARGET="$2"; shift 2 ;;
        --env-file)          ENV_FILE_PATH="$2"; shift 2 ;;
        -h|--help)           sed -n '2,64p' "$0"; exit 0 ;;
        *) echo "Opción desconocida: $1" >&2; exit 2 ;;
    esac
done

if [[ "$ENTORNO" != "dev" && "$ENTORNO" != "test" && "$ENTORNO" != "production" ]]; then
    echo "Uso: $0 <dev|test|production> [opciones]" >&2
    echo "     --api-proxy-target URL     backend del proxy /api/* (variable)" >&2
    echo "     --env-file RUTA            .env de build para ese entorno" >&2
    echo >&2
    echo "El token y el account id NO van por entorno: son secretos de repo." >&2
    echo "  gh secret set CLOUDFLARE_API_TOKEN  --repo $REPO" >&2
    echo "  gh secret set CLOUDFLARE_ACCOUNT_ID --repo $REPO" >&2
    exit 2
fi

command -v gh >/dev/null || { echo "Falta el CLI 'gh'." >&2; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "'gh' no está autenticado." >&2; exit 1; }

# El environment tiene que existir antes de colgarle secretos, pero se crea
# SOLO si falta. Un `PUT` a ciegas sobre uno que ya existe puede llevarse por
# delante sus reglas de protección (revisores obligatorios, política de rama)
# según qué mande el cuerpo, y este script no es quien debe tocar eso: su
# trabajo son los secretos.
if ! gh api "repos/$REPO/environments/$ENTORNO" >/dev/null 2>&1; then
    echo "El entorno '$ENTORNO' no existe; creándolo SIN reglas de protección."
    echo "Configura revisores y política de rama en Settings -> Environments."
    gh api -X PUT "repos/$REPO/environments/$ENTORNO" >/dev/null
fi

echo "Entorno: $ENTORNO  (repo $REPO)"

# ─── Aviso si quedaron duplicados del token a nivel entorno ──────────
#
# Un secreto de entorno PISA al de repositorio. Si alguien dejó una copia
# vieja acá, el deploy usaría esa y rotar el de repo no tendría efecto —
# un fallo silencioso y difícil de ver.
for SOBRANTE in CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID; do
    if gh api "repos/$REPO/environments/$ENTORNO/secrets/$SOBRANTE" >/dev/null 2>&1; then
        echo "  AVISO: '$SOBRANTE' existe como secreto del entorno '$ENTORNO'." >&2
        echo "         Pisa al de repositorio. Borralo con:" >&2
        echo "           gh secret delete $SOBRANTE --env $ENTORNO --repo $REPO" >&2
    fi
done

# ─── ENV_FILE ────────────────────────────────────────────────────────
verificar_env() {
    # Lee el .env por STDIN, comprueba que no le faltan claves respecto a
    # .env.example y lo reemite. Sin esto el fallo típico es silencioso: el
    # bundle se construye con el default de `src/config/env.ts` (que existe
    # para TODAS las claves) y nadie se entera hasta que la app apunta al
    # backend equivocado en producción.
    local tmp; tmp="$(mktemp)"
    cat > "$tmp"
    if [[ -f .env.example ]]; then
        local faltan
        faltan="$(comm -23 \
            <(grep -oE '^[A-Za-z_0-9]+=' .env.example | tr -d '=' | sort -u) \
            <(grep -oE '^[A-Za-z_0-9]+=' "$tmp"       | tr -d '=' | sort -u) || true)"
        if [[ -n "$faltan" ]]; then
            echo "  AVISO: faltan claves que .env.example sí documenta:" >&2
            echo "$faltan" | sed 's/^/    - /' >&2
            echo "  (no se aborta: puede ser intencionado, pero revísalo)" >&2
        fi
    fi
    cat "$tmp"
    rm -f "$tmp"
}

if [[ -n "$ENV_FILE_PATH" ]]; then
    [[ -f "$ENV_FILE_PATH" ]] || { echo "No existe $ENV_FILE_PATH" >&2; exit 1; }
    verificar_env < "$ENV_FILE_PATH" \
        | gh secret set ENV_FILE --env "$ENTORNO" --repo "$REPO"
    echo "  ENV_FILE               ok  (secreto, desde $ENV_FILE_PATH)"
fi

# ─── Variables (no secretos) ─────────────────────────────────────────

if [[ -n "$API_PROXY_TARGET" ]]; then
    gh variable set API_PROXY_TARGET --env "$ENTORNO" --repo "$REPO" --body "$API_PROXY_TARGET"
    echo "  API_PROXY_TARGET       ok  (variable: $API_PROXY_TARGET)"
fi

echo
echo "Secretos en el entorno '$ENTORNO':"
gh api "repos/$REPO/environments/$ENTORNO/secrets" \
    -q '.secrets[]? | "  - " + .name + "  (actualizado " + .updated_at + ")"'
echo "Variables en el entorno '$ENTORNO':"
gh api "repos/$REPO/environments/$ENTORNO/variables" \
    -q '.variables[]? | "  - " + .name + " = " + .value'
