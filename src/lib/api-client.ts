import Axios, { type InternalAxiosRequestConfig } from "axios"
import { toast } from "sonner"

import { env } from "@/config/env"
import { paths } from "@/config/paths"
import { queryClient } from "@/lib/query-client"

declare module "axios" {
  export interface AxiosInstance {
    // El response interceptor de abajo desenvuelve `response.data` en runtime
    // para TODAS las llamadas a `api.*` — pero `get`/`post`/`put`/`patch`/
    // `delete` heredados de `Axios` siguen tipados con su default
    // (`R = AxiosResponse<T>`), así que sin esto cada call site tipaba mal
    // (`AxiosResponse<T>` en vez de `T`) aunque funcionara bien en runtime.
    // Se pisan acá con el mismo truco que ya usaba `query` (declararlas
    // directo en `AxiosInstance` gana por sobre las heredadas de `Axios` en
    // la resolución de overloads).
    get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>
    delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>
    post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
    put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
    patch<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
    // Lecturas con body (filtros anidados, sorts compuestos) que no entran
    // cómodo en query params. Va por POST; el nombre `query` marca que la
    // intención es leer, no mutar. Corre por el response interceptor que ya
    // desenvuelve `response.data`, así que la promesa resuelve a `T` directo.
    query<T = unknown>(url: string, data?: unknown): Promise<T>
  }
}

// Persistido en localStorage solo cuando el usuario marcó "Mantener sesión".
// Si no, el token vive en memoria y muere con la pestaña — mismo efecto que
// un refresh token que expira al cerrar el navegador.
//
// La clave va namespaced por modo: el token que emite MSW es un JWT sin
// firma (`alg: none`, ver mocks/db/auth.ts) que el gateway real rechaza con
// 401 `invalid_token`. Con una sola clave compartida, cambiar
// ENABLE_API_MOCKING dejaba el token del modo anterior en storage y el front
// se lo mandaba al backend equivocado.
/**
 * El access token vive SOLO en memoria — nunca en `localStorage`.
 *
 * Guardarlo en storage lo deja al alcance de cualquier script inyectado: un
 * XSS se lleva la sesión entera y no hay forma de revocarla desde el cliente.
 * El backend ya resuelve la persistencia bien: al hacer login emite la cookie
 * `sso_refresh` con `HttpOnly` + `SameSite=Strict` + `Secure` (ver
 * `JsonLoginFilter` en auth-center, cuyo propio comentario dice que es para no
 * tener el refresh en "JS-accessible storage"). Duplicar eso en
 * `localStorage` no agregaba nada y anulaba la defensa.
 *
 * Consecuencia: al recargar la página el token en memoria se pierde, y la
 * sesión se restaura con `POST /auth/refresh`, que se autentica con la cookie
 * —no con el Bearer—. Eso es exactamente lo que ya hace `getUser()` en
 * `lib/auth.ts`, así que "Mantener sesión iniciada" sigue funcionando: lo que
 * decide cuánto dura es el `Max-Age` de la cookie, no el navegador del
 * usuario.
 */
let authToken: string | null = null

export function setAuthToken(token: string | null) {
  authToken = token
}

/**
 * Endpoints que NO deben llevar `Authorization`.
 *
 * El gateway valida el Bearer en un filtro, antes de mirar qué endpoint es: si
 * el token está vencido responde 401 `invalid_token` y nunca llega a procesar
 * la petición. Mandarle un token viejo a `/auth/login` volvía el login
 * imposible —"JWT expired ... ago"— y como el 401 en la pantalla de login no
 * limpia nada (ver el interceptor de respuesta), la única salida era borrar
 * localStorage a mano. Loguearse es justamente lo que se hace cuando NO se
 * tiene una credencial válida; el header sobra.
 *
 * `/auth/refresh` no está acá: en el mock es el Bearer lo que identifica al
 * usuario (no hay cookie que mandar).
 */
const UNAUTHENTICATED_ENDPOINTS = [
  "/auth/login",
  "/sso-admin/forgotPassword",
  "/sso-admin/forgotUsername",
  "/sso-admin/restorePassword",
  "/sso-admin/resetTokenStatus",
]

/**
 * Se exporta para `report-client`: los reportes necesitan una instancia de
 * axios propia —la de `api` desenvuelve `response.data` y ahi se pierden las
 * cabeceras que traen el nombre del archivo y el conteo de filas—, pero tiene
 * que mandar el mismo Bearer que el resto de la app.
 */
export function authRequestInterceptor(config: InternalAxiosRequestConfig) {
  if (config.headers) {
    config.headers.Accept = "application/json"
    const url = config.url ?? ""
    const sendsCredentials = !UNAUTHENTICATED_ENDPOINTS.some((endpoint) => url.startsWith(endpoint))
    if (authToken && sendsCredentials) {
      config.headers.Authorization = `Bearer ${authToken}`
    }
  }
  return config
}

let isHandlingExpiredSession = false

// Endpoints que se llaman *sin* sesión: los de recuperación de contraseña /
// usuario y el chequeo de sesión. Un 401 acá no significa "se venció tu
// sesión" (no había ninguna), sino "este enlace no sirve" — y cada pantalla
// ya tiene su propio estado para eso. Sin esta lista, abrir
// /restore-password?token=... con un token que el backend rechaza terminaba
// en un redirect duro a /login.
const PUBLIC_ENDPOINTS = [
  "/auth/refresh",
  "/sso-admin/resetTokenStatus",
  "/sso-admin/restorePassword",
  "/sso-admin/forgotPassword",
  "/sso-admin/forgotUsername",
]

// Sondas: se llaman para *averiguar* un estado, y "no autorizado" es una de
// las respuestas posibles. Cada pantalla decide qué mostrar, así que no
// tostean. El resto de los públicos (restore/forgot) sí avisa: ahí el error
// es el resultado de una acción que el usuario disparó.
const PROBE_ENDPOINTS = ["/auth/refresh", "/sso-admin/resetTokenStatus"]

// El módulo de periodos académicos ya muestra sus propios avisos (banner
// inline en el diálogo o `notify()`/NoticeOutlet de página) para cada
// mutación — el toast global duplicaba el mismo mensaje de error. En vez de
// mantener una lista de endpoints (se desactualiza apenas cambia una ruta),
// el propio módulo prende/apaga este flag al montarse/desmontarse
// (ver `useSuppressGlobalErrorToast` en el layout del módulo).
let suppressGlobalErrorToast = false

export function setSuppressGlobalErrorToast(value: boolean) {
  suppressGlobalErrorToast = value
}

// Los errores de constraint (`RAISE EXCEPTION` en las funciones PL/pgSQL)
// llegan con todo el contexto crudo de Postgres, p.ej.:
//   "Conflict: ERROR: No se puede eliminar el grado 3725: existen horarios
//   configurados\nWhere: PL/pgSQL function academico_test.fn_grado_soft_delete
//   (bigint,bigint) line 20 at RAISE"
// Al usuario solo le sirve la oración real ("No se puede eliminar..."); el
// resto (prefijo HTTP, "ERROR:", el "Where:" con la función/línea) es ruido
// de implementación. Nos quedamos con la primera línea y le sacamos el
// prefijo tipo "Conflict: ERROR: " si vino.
/**
 * Violaciones de UNIQUE traducidas a algo accionable.
 *
 * Un `RAISE EXCEPTION` de una función PL/pgSQL trae un texto escrito para el
 * usuario, así que alcanza con recortarlo. Un choque de constraint, en cambio,
 * llega crudo del motor —"duplicate key value violates unique constraint
 * «u_testablecimiento_1»"— y no le dice a nadie QUÉ campo repitió. Peor: el
 * nombre de la constraint no se parece al del campo en pantalla
 * (`u_testablecimiento_1` es `UNIQUE (codigo)`, que en el formulario es el
 * código DANE), así que quien lo lee suele buscar el problema donde no está.
 *
 * Solo las que un usuario puede provocar desde la app; el resto cae al mensaje
 * genérico de abajo.
 */
const CONSTRAINT_MESSAGES: Record<string, string> = {
  u_testablecimiento_1: "Ya existe un establecimiento con ese código DANE.",
  u_trol_1: "Ya existe un rol con ese nombre.",
  u_tmenu_1: "Ya existe un menú con ese nombre.",
  u_trol_menu_1: "Ese menú ya está asignado al rol.",
  u_tlista_valor_1: "Ya existe un registro con ese valor.",
}

export function cleanErrorMessage(message: string): string {
  const constraint = message.match(/unique constraint "([^"]+)"/i)?.[1]
  if (constraint) {
    return (
      CONSTRAINT_MESSAGES[constraint.toLowerCase()] ??
      "Ya existe un registro con esos datos: hay un campo que no puede repetirse."
    )
  }

  const firstLine = message.split(/\r?\n/)[0]?.trim() ?? message
  return firstLine.replace(/^[A-Za-z ]+:\s*ERROR:\s*/i, "").trim() || firstLine
}

export const api = Axios.create({
  baseURL: env.API_URL,
})

api.interceptors.request.use(authRequestInterceptor)
api.interceptors.response.use(
  // El response interceptor desenvuelve `response.data` — todas las llamadas
  // a `api.*` (incluyendo `api.query`) resuelven con el body directo.
  (response) => response.data,
  (error) => {
    // /auth/refresh se llama para *comprobar* si hay sesión (no hay /auth/me
    // en el backend real) — un 401 ahí es una respuesta normal ("no
    // autenticado"), no un fallo que deba redirigir. getUser() en lib/auth.ts
    // ya lo captura y devuelve null. Lo mismo vale para los endpoints de
    // recuperación, que corren sin sesión.
    const requestUrl = error.config?.url ?? ""
    const isPublicEndpoint = PUBLIC_ENDPOINTS.some((endpoint) => requestUrl.startsWith(endpoint))
    const isUnauthorized = error.response?.status === 401

    // Sin guard, un 401 en /login mismo (todavía no existe esa página)
    // reintentaría redirigir a /login en loop infinito.
    const onLoginPage = window.location.pathname === paths.auth.login.path
    const isExpiredSession = isUnauthorized && !onLoginPage && !isPublicEndpoint

    // El backend dice explícitamente que el token no sirve (vencido, mal
    // firmado, revocado). Hay que soltarlo SIEMPRE, incluso en la pantalla de
    // login y en los endpoints públicos: son justo los casos que el guard de
    // arriba excluye del manejo de "sesión vencida", y por eso un token
    // vencido en storage podía dejar el login trabado en bucle —cada intento
    // volvía a mandarlo y el gateway volvía a rechazarlo— sin más salida que
    // borrar localStorage a mano.
    if (isUnauthorized && error.response?.data?.error === "invalid_token") {
      setAuthToken(null)
    }

    // Una sesión caída hace fallar *todas* las queries en vuelo a la vez.
    // Sin este latch salía un toast y un `window.location.href` por cada
    // una. El latch no se resetea: la redirección recarga la página entera
    // y con ella este módulo.
    if (isExpiredSession && isHandlingExpiredSession) {
      return Promise.reject(error)
    }

    const isProbe = PROBE_ENDPOINTS.some((endpoint) => requestUrl.startsWith(endpoint))

    if (!isProbe && !suppressGlobalErrorToast) {
      const message = error.response?.data?.message || error.message
      toast.error(cleanErrorMessage(message))
    }

    if (isExpiredSession) {
      isHandlingExpiredSession = true
      setAuthToken(null)
      queryClient.clear()
      const redirectTo = window.location.pathname
      window.location.href = paths.auth.login.getHref(redirectTo)
    }

    return Promise.reject(error)
  },
)

// Un 404 del backend significa "este recurso no existe", no "algo falló": las
// pantallas de detalle lo traducen a la página de "no encontrado" del router
// en vez de mostrar un error genérico.
export function isNotFoundError(error: unknown): boolean {
  return Axios.isAxiosError(error) && error.response?.status === 404
}

// Mismo mensaje que ya muestra el toast global del interceptor (arriba),
// pero para diálogos que quieren mostrarlo en su propio banner en vez de (o
// además de) el toast — p.ej. para que no quede detrás del overlay del
// modal. Reusa `cleanErrorMessage` para recortar el ruido de Postgres.
export function getErrorMessage(error: unknown): string {
  if (Axios.isAxiosError(error)) {
    const message = error.response?.data?.message || error.message
    return cleanErrorMessage(message)
  }
  if (error instanceof Error) return cleanErrorMessage(error.message)
  return "No fue posible completar la operación."
}

// Queries complejas que no entran cómodo en query params (filtros anidados,
// sorts compuestos, etc.) y por eso necesitan body. Se mandan por POST, que
// es lo que soporta el gateway. Como el response interceptor ya desenvuelve
// `response.data`, casteamos el resultado a `T`.
api.query = <T>(url: string, data?: unknown): Promise<T> =>
  api.request<T>({ method: "POST", url, data }) as unknown as Promise<T>
