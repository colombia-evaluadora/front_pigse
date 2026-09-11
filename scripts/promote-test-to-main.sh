#!/usr/bin/env bash
# =============================================================================
# promote-test-to-main.sh — promueve lo acumulado en `test` a `main`.
#
# Portado de `colombia-evaluadora/SSO`, adaptado a este repo (sin Flyway, con
# deploy a Cloudflare Workers en vez de imágenes Docker).
#
# ---- El método de merge NO es cosmético -------------------------------------
#
# Squash para `feature → dev`, MERGE COMMIT para `dev → test` y `test → main`.
# GitHub no permite fijarlo por rama, así que es una convención que se rompe
# con un clic — y en el SSO se rompió dos veces.
#
# La consecuencia: un squash crea en la rama destino un commit que no existe
# en la de origen, las dos divergen para siempre, y la siguiente promoción
# vuelve a conflictuar sobre contenido que YA estaba aplicado. En el SSO, la
# promoción siguiente a dos squashes dio 41 conflictos.
#
# Por eso este script imprime —y opcionalmente ejecuta— `gh pr merge --merge`.
# Nunca `--squash`.
#
# ---- Uso --------------------------------------------------------------------
#
#   ./scripts/promote-test-to-main.sh              # abre la PR (recomendado)
#   ./scripts/promote-test-to-main.sh --merge      # abre la PR y la mergea
#   ./scripts/promote-test-to-main.sh --take-test  # resuelve conflictos con test
#
# Requisitos: gh autenticado, git, red.
# =============================================================================
set -euo pipefail

TEST="test"
MAIN="main"
AUTO_MERGE=0
TAKE_TEST=0

while [[ $# -gt 0 ]]; do
    case "$1" in
        --merge)     AUTO_MERGE=1; shift ;;
        --take-test) TAKE_TEST=1; shift ;;
        -h|--help)   sed -n '2,29p' "$0"; exit 0 ;;
        *) echo "Opción desconocida: $1" >&2; exit 2 ;;
    esac
done

command -v gh >/dev/null || { echo "Falta el CLI 'gh'." >&2; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "'gh' no está autenticado." >&2; exit 1; }

# El repo sale del remote, no de una constante que envejece en silencio.
REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner)"

# Un árbol sucio + los `git checkout` de abajo es la receta para perder
# trabajo sin enterarse.
if [[ -n "$(git status --porcelain)" ]]; then
    echo "El árbol de trabajo tiene cambios sin commitear. Guárdalos antes." >&2
    git status --short >&2
    exit 1
fi

RAMA_ORIGINAL="$(git rev-parse --abbrev-ref HEAD)"
volver() { git checkout -q "$RAMA_ORIGINAL" 2>/dev/null || true; }
trap volver EXIT

echo "Repo: $REPO"
echo "→ Sincronizando refs..."
git fetch origin "$TEST" "$MAIN" --quiet

PENDIENTES="$(git rev-list --count "origin/${MAIN}..origin/${TEST}")"
DIVERGENTES="$(git rev-list --count "origin/${TEST}..origin/${MAIN}")"

echo
echo "→ Commits en 'test' que no están en 'main' (${PENDIENTES}):"
git log --oneline "origin/${MAIN}..origin/${TEST}" | head -40
[[ "$PENDIENTES" -gt 40 ]] && echo "   ... y $((PENDIENTES - 40)) más"

if [[ "$DIVERGENTES" -gt 0 ]]; then
    echo
    echo "→ AVISO: 'main' tiene ${DIVERGENTES} commit(s) que 'test' no tiene:"
    git log --oneline "origin/${TEST}..origin/${MAIN}" | sed 's/^/   /'
    echo "   Revisa que su contenido ya viajó a test antes de promover."
fi

if [[ "$PENDIENTES" -eq 0 ]]; then
    echo
    echo "Nada que promover: 'test' no adelanta a 'main'."
    exit 0
fi

# El contaje de commits MIENTE cuando la promoción anterior se mergeó con
# squash: el commit aplastado no es ancestro de `test`, así que git sigue
# viendo "pendientes" commits cuyo contenido ya está en `main`. Lo que decide
# si hay algo que promover es el CONTENIDO, no la ancestría.
if git diff --quiet "origin/${MAIN}" "origin/${TEST}"; then
    echo
    echo "Nada que promover: 'main' y 'test' son IDÉNTICOS en contenido."
    echo
    echo "Git reporta ${PENDIENTES} commit(s) pendientes, pero es un espejismo:"
    echo "la promoción anterior se mergeó con squash, así que su commit no es"
    echo "ancestro de 'test' y los cambios ya aplicados siguen contándose."
    echo
    echo "Por eso las promociones van con merge commit:"
    echo "  gh pr merge <n> --merge      # NO --squash"
    exit 0
fi

# ─── ¿Mergea limpio? ─────────────────────────────────────────────────────────
#
# `merge-tree --write-tree` simula el merge sin tocar el árbol de trabajo ni
# crear commits. Es la forma de saber si hace falta rama de promoción ANTES de
# abrir una PR que nadie va a poder mergear.
echo
echo "→ Simulando el merge..."
if git merge-tree --write-tree "origin/${MAIN}" "origin/${TEST}" >/dev/null 2>&1; then
    LIMPIO=1
    echo "   Sin conflictos."
else
    LIMPIO=0
    N_CONF="$(git merge-tree --write-tree "origin/${MAIN}" "origin/${TEST}" 2>&1 \
              | awk '/^[0-7]{6} /{print $4}' | sort -u | wc -l)"
    echo "   ${N_CONF} fichero(s) en conflicto."
fi

if [[ "$LIMPIO" -eq 1 ]]; then
    HEAD_PR="$TEST"
    echo "→ La PR puede salir directamente de 'test'."
else
    HEAD_PR="promote/test-to-main-$(date +%Y%m%d-%H%M)"
    echo
    echo "→ Hay conflictos: creo la rama '${HEAD_PR}' para resolverlos."
    git checkout -q -b "$HEAD_PR" "origin/${MAIN}"
    git merge --no-commit --no-ff "origin/${TEST}" >/dev/null 2>&1 || true

    if [[ "$TAKE_TEST" -eq 1 ]]; then
        # Deja el árbol EXACTAMENTE igual al de test, conservando MERGE_HEAD
        # para que el commit salga con sus dos padres.
        #
        # Es lo correcto cuando `test` es la línea validada (está desplegada y
        # pasó QA). NO es un comodín: si `main` tiene contenido propio que no
        # viajó a test, esto LO BORRA. Por eso el aviso de los divergentes.
        echo "   --take-test: el árbol queda idéntico a origin/${TEST}."
        git read-tree -u --reset "origin/${TEST}"
        git commit -q -m "chore(release): promover test a main

Resuelto tomando el árbol de test, idéntico a origin/${TEST}."
    else
        echo
        echo "   Resuélvelos y termina el merge:"
        echo "     git status"
        echo "     # ...resolver..."
        echo "     git commit"
        echo "     git push -u origin ${HEAD_PR}"
        echo
        echo "   Si el criterio es 'test manda', relanza con --take-test."
        trap - EXIT
        exit 3
    fi
    git push -q -u origin "$HEAD_PR"
fi

# ─── PR ──────────────────────────────────────────────────────────────────────
echo
echo "→ Abriendo la PR..."
URL="$(gh pr create \
    --repo "$REPO" \
    --base "$MAIN" \
    --head "$HEAD_PR" \
    --title "chore(release): promote test → main" \
    --body "Promoción de los ${PENDIENTES} commits acumulados en \`test\`.

Revisa \`git log origin/main..origin/test --oneline\` antes de aprobar.

## Antes de mergear

- [ ] \`test\` verde en CI
- [ ] QA dio el visto bueno sobre lo desplegado en el Worker de test
- [ ] Los commits listados son los esperados

## Cómo mergear — importa

\`\`\`bash
gh pr merge <n> --merge     # merge commit. NUNCA --squash
\`\`\`

Un squash aquí crea en \`main\` un commit que no existe en \`test\`, las dos
ramas divergen para siempre y la siguiente promoción vuelve a conflictuar
sobre contenido ya aplicado.

## Después del merge

\`\`\`bash
git checkout main && git pull --ff-only origin main
git tag -a vX.Y.Z -m 'vX.Y.Z: <resumen>'
git push origin vX.Y.Z
\`\`\`

El tag dispara \`release.yml\`, que construye el SPA con el \`ENV_FILE\` de
\`production\` y lo despliega al Worker de producción. El job **espera
aprobación** en el environment \`production\` antes de publicar.")"

echo "   ${URL}"

if [[ "$AUTO_MERGE" -eq 1 ]]; then
    echo
    echo "→ Mergeando con merge commit (--merge)..."
    gh pr merge "$URL" --merge --repo "$REPO"
    echo "   Mergeada. Siguiente paso: el tag."
    echo "     git checkout main && git pull --ff-only origin main"
    echo "     git tag -a vX.Y.Z -m 'vX.Y.Z: <resumen>' && git push origin vX.Y.Z"
else
    echo
    echo "→ Para mergear (merge commit, NO squash):"
    echo "     gh pr merge ${URL##*/} --merge --repo ${REPO}"
fi
