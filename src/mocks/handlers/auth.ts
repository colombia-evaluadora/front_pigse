import { http, HttpResponse, delay } from "msw"

import {
  consumePasswordResetToken,
  createMockAccessToken,
  createPasswordResetToken,
  expirePasswordResetToken,
  findUserByCredentials,
  findUserByDocument,
  findUserByEmail,
  getPasswordResetTokenStatus,
  setUserPassword,
} from "@/mocks/db/auth"

// Sin "recordar" el token muere al cerrar la pestaña. Con "recordar" dura
// 30 días: tiempo suficiente para no obligar a re-loguear seguido y
// acotado para que un token robado no sea eterno.
const SHORT_SESSION_SECONDS = 60 * 60
const LONG_SESSION_SECONDS = 30 * 24 * 60 * 60

/**
 * Cookie de refresh, igual que el backend real (`JsonLoginFilter`
 * en auth-center): nombre `sso_refresh`, `Path=/` para que viaje tanto a
 * `/auth/refresh` como a `/api/auth/refresh`, y `SameSite=Strict`.
 *
 * Es la credencial de larga vida de la sesión, y a propósito NO se guarda en
 * `localStorage`: el refresh vive en la cookie —fuera del alcance de
 * JavaScript en el backend real, gracias a `HttpOnly`— y el access token vive
 * solo en memoria. Así un XSS no puede llevarse la sesión.
 *
 * Salvedad honesta del mock: MSW responde desde el propio navegador, así que
 * la cookie que escribe NO puede ser realmente `HttpOnly` (JS no puede crear
 * una cookie que JS no pueda leer). El atributo va igual para que el contrato
 * se lea idéntico al real, pero la protección de verdad la da el backend.
 */
const REFRESH_COOKIE_NAME = "sso_refresh"

function buildRefreshCookie(value: string, maxAgeSeconds: number): string {
  return [
    `${REFRESH_COOKIE_NAME}=${value}`,
    "Path=/",
    `Max-Age=${maxAgeSeconds}`,
    "HttpOnly",
    "SameSite=Strict",
  ].join("; ")
}

function clearRefreshCookie(): string {
  return `${REFRESH_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict`
}

/** El valor de la cookie es `mock-refresh-<email>`: de ahí sale el usuario. */
function emailFromRefreshCookie(value: string | undefined): string | undefined {
  if (!value?.startsWith("mock-refresh-")) return undefined
  return value.slice("mock-refresh-".length)
}

export const authHandlers = [
  http.post("/api/auth/login", async ({ request }) => {
    await delay(300)
    const { email, password } = (await request.json()) as {
      email: string
      password: string
    }
    const rememberMe = request.headers.get("x-remember-me") === "true"
    const user = findUserByCredentials(email, password)

    if (!user) {
      return HttpResponse.json({ message: "Email o contraseña incorrectos." }, { status: 401 })
    }

    // Sin "recordar", `Max-Age` corto: la cookie muere pronto y la sesión no
    // sobrevive de un día para otro.
    const maxAge = rememberMe ? LONG_SESSION_SECONDS : SHORT_SESSION_SECONDS

    // Mismo contrato que el backend real: solo token/refreshToken/expiresIn,
    // sin objeto "user" — el front lo deriva del propio JWT. El refresh viaja
    // ADEMÁS en la cookie, que es lo que después restaura la sesión.
    return HttpResponse.json(
      {
        token: createMockAccessToken(user),
        refreshToken: `mock-refresh-${user.email}`,
        expiresIn: maxAge,
      },
      { headers: { "Set-Cookie": buildRefreshCookie(`mock-refresh-${user.email}`, maxAge) } },
    )
  }),

  // El backend real no tiene /auth/me: la sesión se restaura pidiendo un token
  // nuevo acá. La credencial es la COOKIE, no el Bearer — igual que
  // `RefreshController` en auth-center, que es `permitAll()` justamente
  // porque "the cookie itself is the auth". Por eso este endpoint sigue
  // funcionando aunque el access token en memoria se haya perdido al recargar.
  http.post("/api/auth/refresh", ({ cookies }) => {
    const email = emailFromRefreshCookie(cookies[REFRESH_COOKIE_NAME])
    const user = email ? findUserByEmail(email) : undefined

    if (!user) {
      return HttpResponse.json({ error: "no_refresh_cookie" }, { status: 401 })
    }

    return HttpResponse.json({
      token: createMockAccessToken(user),
      refreshToken: `mock-refresh-${user.email}`,
      expiresIn: SHORT_SESSION_SECONDS,
    })
  }),

  http.post("/api/auth/logout", async () => {
    await delay(150)
    // Cerrar sesión = matar la cookie. Si no, el próximo refresh la
    // encontraría y devolvería al usuario adentro.
    return HttpResponse.json(
      { message: "Sesión cerrada." },
      { headers: { "Set-Cookie": clearRefreshCookie() } },
    )
  }),

  // Mismo contrato que el backend real (GET /sso-admin/forgotPassword?email=):
  // nunca revela si el email existe, siempre resuelve 200. Diferencia con el
  // real: acá devolvemos el token en el body, porque en un mock no hay correo
  // que abrir — es lo que le permite a /check-email mostrar el vencimiento
  // real y llegar a /restore-password. El front trata el body como opcional.
  http.get("/api/sso-admin/forgotPassword", async ({ request }) => {
    await delay(300)
    const email = new URL(request.url).searchParams.get("email") ?? ""

    // El token se emite exista o no el usuario: si no existe, el reseteo
    // después no cambia nada, pero la respuesta no delata la diferencia.
    const { token, expiresIn } = createPasswordResetToken(email)

    console.info(`[mock] Link de reseteo para ${email}: /restore-password?token=${token}`)

    return HttpResponse.json({ token, expiresIn })
  }),

  // Recuperar usuario a partir del documento: el usuario es el correo, así
  // que pedirlo por correo no tendría sentido.
  http.get("/api/sso-admin/forgotUsername", async ({ request }) => {
    await delay(300)
    const document = new URL(request.url).searchParams.get("document") ?? ""
    const user = findUserByDocument(document)

    if (!user) {
      return HttpResponse.json(
        { message: "No encontramos una cuenta con ese número de documento." },
        { status: 404 },
      )
    }

    return HttpResponse.json({ username: user.email })
  }),

  // Endpoint solo-mock: la pantalla de confirmación lo consulta para saber
  // cuántos segundos le quedan al enlace y para distinguir "venció" de
  // "no existe".
  http.get("/api/sso-admin/resetTokenStatus", ({ request }) => {
    const token = new URL(request.url).searchParams.get("token") ?? ""
    return HttpResponse.json(getPasswordResetTokenStatus(token))
  }),

  // Atajo de desarrollo para probar la pantalla de "enlace expirado" sin
  // esperar los 30 minutos.
  http.post("/api/sso-admin/expireResetToken", async ({ request }) => {
    const { token } = (await request.json()) as { token: string }
    expirePasswordResetToken(token)
    return new HttpResponse(null, { status: 200 })
  }),

  http.post("/api/sso-admin/restorePassword", async ({ request }) => {
    await delay(300)
    const { token, password } = (await request.json()) as {
      token: string
      password: string
    }
    const { email, status } = consumePasswordResetToken(token)

    if (!email) {
      return HttpResponse.json(
        {
          code: status,
          message:
            status === "expired"
              ? "El enlace de recuperación ya expiró. Solicita uno nuevo."
              : "El enlace de recuperación no es válido.",
        },
        { status: 400 },
      )
    }

    setUserPassword(email, password)
    return new HttpResponse(null, { status: 200 })
  }),
]
