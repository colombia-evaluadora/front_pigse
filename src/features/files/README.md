# `files/` — Feature de medios (utility)

No es una feature de negocio. Es una **feature utility**: agrupa los
dos pedazos que necesitan cualquier feature que pinte un archivo
cargado al `TARCHIVO` del backend SSO.

## Qué vive acá

| Archivo                             | Rol                                                                                                   |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `api/query/use-archivo-view-url.ts` | Hook que acuña un token de vista para un `pk_tarchivo` y devuelve la URL firmada (`archivoId` → URL). |
| `components/archivo-image.tsx`      | Imagen que pide esa URL por su id, con estados de carga (skeleton) y error (fallback).                |

## Por qué feature y no `lib/` o `components/`

- `useArchivoViewUrl` necesita pinchar el gateway del SSO
  (`POST /api/files/upload-token`), así que depende de `lib/api-client`
  — round-trip con un endpoint del backend. No es lógica pura.
- `ArchivoImage` consume ese hook y le da UI. No es re-usable fuera
  del modelo `TARCHIVO` (no muestra cualquier URL; muestra archivos
  servidos por el endpoint de files del SSO).

## Convención

No tiene `pages/`, no se monta en el router, no aparece en el sidebar.
Las features de negocio (e.g. `establishment/institution`) lo importan
directamente desde el árbol de componentes:

```tsx
import { ArchivoImage } from "@/features/files/components/archivo-image"
```

Si en el futuro hace falta un visor de PDFs, una miniatura de imagen,
una subida, etc., todo eso vive acá — sin abrir una nueva ruta.
