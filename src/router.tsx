import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
  lazyRouteComponent,
  Outlet,
} from "@tanstack/react-router"
import type { QueryClient } from "@tanstack/react-query"

import { paths } from "@/config/paths"
import { humanizeSlug } from "@/config/breadcrumbs"
import { hasSession } from "@/lib/auth"
import { queryClient } from "@/lib/query-client"
import { NotFoundPage } from "@/components/layout/not-found-page"
import { ErrorPage } from "@/components/layout/error-page"
import { MenuErrorPage } from "@/components/layout/menu-error-page"
import { UnauthorizedPage } from "@/components/layout/unauthorized-page"
import { unauthorizedSearchSchema } from "@/components/layout/unauthorized-search"
import {
  activateSearchSchema,
  checkEmailSearchSchema,
  loginSearchSchema,
  restorePasswordSearchSchema,
} from "@/features/auth/api/schema"
import { establishmentsSearchSchema } from "@/features/establishment/institution/api/schema"
import { campusesSearchSchema } from "@/features/establishment/campuses/api/schema"
import { employeesSearchSchema } from "@/features/establishment/employees/api/schema"
import { NoticeProvider } from "@/components/notice/notice-context"
import { visorSearchSchema } from "@/features/pdf-viewer/api/schema"
import {
  auditsSearchSchema,
  auditTablesSearchSchema,
  sessionOperationsSearchSchema,
  tableOperationsSearchSchema,
} from "@/features/administration/audits/api/schema"
import { userActivitySearchSchema } from "@/features/administration/user-activity/api/schema"
import { documentTypeDisplayName } from "@/features/document-management/api/types/document"
import {
  fetchNavItemsForAccess,
  getFirstNavUrl,
} from "@/features/navigation/api/query/use-nav-items-query"
import { canAccessPath } from "@/features/navigation/lib/route-access"

/*const LandingPage = lazyRouteComponent(
  () => import("@/features/landing/pages/landing-page"),
  "LandingPage"
)*/
const LoginPage = lazyRouteComponent(() => import("@/features/auth/pages/login-page"), "LoginPage")
const ForgotPasswordPage = lazyRouteComponent(
  () => import("@/features/auth/pages/forgot-password-page"),
  "ForgotPasswordPage",
)
const ForgotUsernamePage = lazyRouteComponent(
  () => import("@/features/auth/pages/forgot-username-page"),
  "ForgotUsernamePage",
)
const CheckEmailPage = lazyRouteComponent(
  () => import("@/features/auth/pages/check-email-page"),
  "CheckEmailPage",
)
const RestorePasswordPage = lazyRouteComponent(
  () => import("@/features/auth/pages/restore-password-page"),
  "RestorePasswordPage",
)
const ActivatePage = lazyRouteComponent(
  () => import("@/features/auth/pages/activate-page"),
  "ActivatePage",
)
const AuthLayout = lazyRouteComponent(() => import("@/components/layout/auth-layout"), "AuthLayout")
const ProtectedLayout = lazyRouteComponent(
  () => import("@/components/layout/protected-layout"),
  "ProtectedLayout",
)
const EstablishmentsPage = lazyRouteComponent(
  () => import("@/features/establishment/institution/pages/establishments-page"),
  "EstablishmentsPage",
)

const EmployeesPage = lazyRouteComponent(
  () => import("@/features/establishment/employees/pages/employees-page"),
  "EmployeesPage",
)

const CampusesPage = lazyRouteComponent(
  () => import("@/features/establishment/campuses/pages/campuses-page"),
  "CampusesPage",
)

const RolesMenusPage = lazyRouteComponent(
  () => import("@/features/administration/roles-menus/pages/roles-menus-page"),
  "RolesMenusPage",
)

const AuditSessionPage = lazyRouteComponent(
  () => import("@/features/administration/audits/pages/audit-session-page"),
  "AuditSessionPage",
)
const AuditTablesPage = lazyRouteComponent(
  () => import("@/features/administration/audits/pages/audit-tables-page"),
  "AuditTablesPage",
)
const TableOperationsPage = lazyRouteComponent(
  () => import("@/features/administration/audits/pages/table-operations-page"),
  "TableOperationsPage",
)
const UserActivityPage = lazyRouteComponent(
  () => import("@/features/administration/user-activity/pages/user-activity-page"),
  "UserActivityPage",
)
const SessionOperationsPage = lazyRouteComponent(
  () => import("@/features/administration/audits/pages/session-operations-page"),
  "SessionOperationsPage",
)

const AddEstablishmentPage = lazyRouteComponent(
  () => import("@/features/establishment/institution/pages/add-establishment-page"),
  "AddEstablishmentPage",
)

const DocumentManagementPage = lazyRouteComponent(
  () => import("@/features/document-management/pages/document-management-page"),
  "DocumentManagementPage",
)
const DocumentCategoryDetailPage = lazyRouteComponent(
  () => import("@/features/document-management/pages/document-category-detail-page"),
  "DocumentCategoryDetailPage",
)
const DocumentDeadlinePage = lazyRouteComponent(
  () => import("@/features/document-management/pages/document-deadline-page"),
  "DocumentDeadlinePage",
)

const MonitoringCompliancePage = lazyRouteComponent(
  () => import("@/features/monitoring/pages/monitoring-compliance-page"),
  "MonitoringCompliancePage",
)

const PdfViewerPage = lazyRouteComponent(
  () => import("@/features/pdf-viewer/pages/pdf-viewer-page"),
  "PdfViewerPage",
)

interface RouterContext {
  queryClient: QueryClient
}

const APP_NAME = "Colombia Evaluadora"
// const APP_DESCRIPTION = "Colombia Evaluadora: gestión de pagos con filtros, orden y paginación."
// const SITE_URL = env.APP_URL
// const OG_IMAGE = `${SITE_URL}/favicon.svg`

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: Outlet,
  head: () => ({
    meta: [{ title: APP_NAME }],
  }),
})

/*
const landingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: paths.home.path,
  head: () => ({
    meta: [
      { title: APP_NAME },
      { name: "description", content: APP_DESCRIPTION },
      { property: "og:title", content: APP_NAME },
      { property: "og:description", content: APP_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_URL },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: APP_NAME },
      { name: "twitter:description", content: APP_DESCRIPTION },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: SITE_URL }],
  }),
  component: LandingPage,
})*/

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: paths.home.path,
  beforeLoad: () => {
    throw redirect({ to: paths.auth.login.path })
  },
})

const authLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "_auth",
  component: AuthLayout,
})

const loginRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: paths.auth.login.path,
  validateSearch: loginSearchSchema,
  head: () => ({
    meta: [
      { title: `Iniciar sesión · ${APP_NAME}` },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  beforeLoad: async ({ context, search }) => {
    if (await hasSession(context.queryClient)) {
      throw redirect({ to: search.redirectTo || paths.app.root.getHref() })
    }
  },
  component: LoginPage,
})

const forgotPasswordRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: paths.auth.forgotPassword.path,
  head: () => ({
    meta: [
      { title: `Recuperar contraseña · ${APP_NAME}` },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ForgotPasswordPage,
})

const forgotUsernameRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: paths.auth.forgotUsername.path,
  head: () => ({
    meta: [
      { title: `Recuperar correo · ${APP_NAME}` },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ForgotUsernamePage,
})

const checkEmailRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: paths.auth.checkEmail.path,
  validateSearch: checkEmailSearchSchema,
  head: () => ({
    meta: [
      { title: `Revisa tu correo · ${APP_NAME}` },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CheckEmailPage,
})

const restorePasswordRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: paths.auth.restorePassword.path,
  validateSearch: restorePasswordSearchSchema,
  head: () => ({
    meta: [
      { title: `Restablecer contraseña · ${APP_NAME}` },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RestorePasswordPage,
})

const activateRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: paths.auth.activate.path,
  validateSearch: activateSearchSchema,
  head: () => ({
    meta: [
      { title: `Activa tu cuenta · ${APP_NAME}` },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ActivatePage,
})

const appLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: paths.app.root.path,
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  beforeLoad: async ({ context, location }) => {
    if (!(await hasSession(context.queryClient))) {
      throw redirect({
        to: paths.auth.login.path,
        search: { redirectTo: location.href },
      })
    }

    // Acá solo se valida la sesión. El acceso a cada módulo lo decide
    // `menuGuardRoute` (abajo) contra el MENÚ del usuario, no contra una
    // tabla de roles en el front: el viejo `ROUTE_ACCESS` de
    // `lib/auth-routes.ts` duplicaba a mano `role_route` del SSO y se
    // desincronizaba (un rol con el menú asignado pero ausente de la tabla
    // terminaba rebotado a "No autorizado" — reportado en vivo).
  },
  component: ProtectedLayout,
})

/**
 * Guard de rutas por menú (QA: un usuario autenticado abría cualquier módulo
 * escribiendo la URL aunque no tuviera ese menú; el backend le negaba los
 * datos, pero la pantalla se montaba igual).
 *
 * Ruta sin path (`_menu`) de la que cuelgan TODAS las pantallas de módulo.
 * Quedan afuera, colgando directo de `appLayoutRoute`, solo el índice `/app`
 * (redirige al primer ítem del menú) y `/app/sin-acceso` (el destino del
 * guard: si estuviera adentro, se rebotaría a sí misma). Una URL que no
 * matchea ninguna ruta no llega a este `beforeLoad` y cae en "Página no
 * encontrada", como antes.
 *
 * - Permitido = `canAccessPath` (`features/navigation/lib/route-access.ts`):
 *   la URL es un ítem del menú, cuelga de uno, o está mapeada a uno.
 * - Antes de negar se confirma con el menú del backend (si el del cache
 *   tiene más de 10 s): un menú asignado recién desde "Roles y menús" no
 *   debe dar "Sin acceso" hasta recargar. Solo cuesta un request en el
 *   camino de la negación; el permitido sale del cache.
 * - Si el menú no carga (red, 5xx) y no hay uno en cache, no se concede nada
 *   ni se cierra la sesión: el error se pinta con `MenuErrorPage` (con
 *   "Reintentar") dentro del layout, con el sidebar visible. Con un menú en
 *   cache se decide con ese (ver `fetchNavItemsForAccess`).
 */
const MENU_CONFIRM_MAX_AGE_MS = 10_000

const menuGuardRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  id: "_menu",
  beforeLoad: async ({ context, location }) => {
    const cached = await fetchNavItemsForAccess(context.queryClient)
    if (canAccessPath(location.pathname, cached)) return

    const confirmed = await fetchNavItemsForAccess(context.queryClient, {
      maxAgeMs: MENU_CONFIRM_MAX_AGE_MS,
    })
    if (canAccessPath(location.pathname, confirmed)) return

    throw redirect({
      to: paths.app.unauthorized.getHref(),
      search: { desde: location.pathname },
    })
  },
  errorComponent: MenuErrorPage,
  component: Outlet,
})

// Agrupadores sin página propia: enlazan a su primer hijo, igual que el grupo
// colapsable del sidebar (ver nav-main.tsx). Así toda miga es un `<a href>`
// navegable y la cadena del BreadcrumbList queda completa para Google.
const ADMINISTRACION_CRUMB = {
  label: "Administración",
  to: paths.app.auditoriaSesiones.getHref(),
}
const REGISTRO_ACTIVIDAD_CRUMB = {
  label: "Registro de actividad",
  to: paths.app.auditoriaSesiones.getHref(),
}
const ESTABLECIMIENTO_CRUMB = {
  label: "Establecimiento educativo",
  to: paths.app.establishments.general.getHref(),
}
const MONITOREO_CRUMB = {
  label: "Monitoreo",
  to: paths.app.gestionDocumental.getHref(),
}

// `/app` no tiene página propia: manda a la primera ruta que el sidebar del
// usuario trae realmente (`getFirstNavUrl`). Los grupos del sidebar ya
// heredan la ruta de su primer hijo (`toNavItemDtos`), así que el primer
// item del menú siempre es navegable — y, por estar en el menú, siempre pasa
// el guard (`menuGuardRoute`).
//
// Ya no hay respaldo por rol (`findFirstAllowedPath`, borrado): ese mapa no
// conoce el menú, así que todo destino que inventara podía ser justo una
// ruta que el guard después bloquea. Sin menú (vacío, o 403 de `/my-menus`
// para un usuario del SSO sin rol de PIGSE) el destino honesto es "Sin
// acceso"; si el menú no carga, el error con "Reintentar" (`MenuErrorPage`).
const appIndexRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/",
  beforeLoad: async ({ context }) => {
    // `maxAgeMs: 0`, no el cache: esta decisión SIEMPRE tiene que pegarle al
    // backend (`navItemsQueryOptions` tiene `staleTime: Infinity`, pensado
    // para no repetir el fetch en cada render del sidebar). Una sesión vieja
    // que ya cacheó el menú antes de un cambio de `role_route` (asignar/sacar
    // un menú desde "Roles y Menús") podía seguir redirigiendo al ítem viejo
    // hasta el próximo logout/login — reportado en vivo (#58). El mismo fetch
    // además refresca la entrada compartida del cache, así que el sidebar y
    // el guard que corren después de este redirect ya ven el dato al día.
    const items = await fetchNavItemsForAccess(context.queryClient, { maxAgeMs: 0 })
    throw redirect({ to: getFirstNavUrl(items) ?? paths.app.unauthorized.getHref() })
  },
  errorComponent: MenuErrorPage,
})

export const rolesMenusRoute = createRoute({
  getParentRoute: () => menuGuardRoute,
  path: paths.app.rolesMenus.path,
  staticData: {
    breadcrumb: [ADMINISTRACION_CRUMB, { label: "Configuración de roles y menús" }],
  },
  component: RolesMenusPage,
})

export const actividadUsuariosRoute = createRoute({
  getParentRoute: () => menuGuardRoute,
  path: paths.app.actividadUsuarios.path,
  validateSearch: userActivitySearchSchema,
  staticData: {
    breadcrumb: [ADMINISTRACION_CRUMB, { label: "Actividad de usuarios" }],
  },
  component: UserActivityPage,
})

// Mismo criterio que `_establishment`: las cuatro vistas de auditoría
// comparten un `NoticeProvider` para que el aviso de una exportación o de un
// revert siga visible al moverse entre ellas.
const auditsLayoutRoute = createRoute({
  getParentRoute: () => menuGuardRoute,
  id: "_audits",
  component: () => (
    <NoticeProvider>
      <Outlet />
    </NoticeProvider>
  ),
})

export const auditoriaSesionesRoute = createRoute({
  getParentRoute: () => auditsLayoutRoute,
  path: paths.app.auditoriaSesiones.path,
  validateSearch: auditsSearchSchema,
  staticData: {
    breadcrumb: [ADMINISTRACION_CRUMB, REGISTRO_ACTIVIDAD_CRUMB, { label: "Sesiones" }],
  },
  component: AuditSessionPage,
})

export const auditoriaTablasRoute = createRoute({
  getParentRoute: () => auditsLayoutRoute,
  path: paths.app.auditoriaTablas.path,
  validateSearch: auditTablesSearchSchema,
  staticData: {
    breadcrumb: [
      ADMINISTRACION_CRUMB,
      REGISTRO_ACTIVIDAD_CRUMB,
      { label: "Tablas" },
    ],
  },
  component: AuditTablesPage,
})

export const auditoriaTablaDetalleRoute = createRoute({
  getParentRoute: () => auditsLayoutRoute,
  path: paths.app.auditoriaTablaDetalle.path,
  validateSearch: tableOperationsSearchSchema,
  staticData: {
    breadcrumb: (params) => [
      ADMINISTRACION_CRUMB,
      REGISTRO_ACTIVIDAD_CRUMB,
      { label: "Tablas", to: paths.app.auditoriaTablas.getHref() },
      { label: humanizeSlug(params.tableSlug) },
    ],
  },
  component: TableOperationsPage,
})

export const auditoriaSesionOperacionesRoute = createRoute({
  getParentRoute: () => auditsLayoutRoute,
  path: paths.app.auditoriaSesionOperaciones.path,
  validateSearch: sessionOperationsSearchSchema,
  staticData: {
    breadcrumb: [
      ADMINISTRACION_CRUMB,
      REGISTRO_ACTIVIDAD_CRUMB,
      { label: "Sesiones", to: paths.app.auditoriaSesiones.getHref() },
      { label: "Operaciones" },
    ],
  },
  component: SessionOperationsPage,
})

// Ruta sin path propio: agrupa establecimientos/funcionarios bajo un
// único `NoticeProvider` para que un aviso disparado en un formulario de
// alta/edición siga visible al navegar de vuelta al listado (a diferencia de
// un provider por página, que se desmonta antes de que el usuario lo vea).
const establishmentLayoutRoute = createRoute({
  getParentRoute: () => menuGuardRoute,
  id: "_establishment",
  component: () => (
    <NoticeProvider>
      <Outlet />
    </NoticeProvider>
  ),
})

export const establishmentsRoute = createRoute({
  getParentRoute: () => establishmentLayoutRoute,
  path: paths.app.establishments.general.path,
  validateSearch: establishmentsSearchSchema,
  staticData: { breadcrumb: [ESTABLECIMIENTO_CRUMB, { label: "Establecimiento" }] },
  component: EstablishmentsPage,
})

export const campusesRoute = createRoute({
  getParentRoute: () => establishmentLayoutRoute,
  path: paths.app.establishments.campuses.path,
  validateSearch: campusesSearchSchema,
  staticData: { breadcrumb: [ESTABLECIMIENTO_CRUMB, { label: "Sedes educativas" }] },
  component: CampusesPage,
})

export const employeesRoute = createRoute({
  getParentRoute: () => establishmentLayoutRoute,
  path: paths.app.establishments.officials.path,
  validateSearch: employeesSearchSchema,
  staticData: { breadcrumb: [ESTABLECIMIENTO_CRUMB, { label: "Funcionarios" }] },
  component: EmployeesPage,
})

export const addEstablishmentRoute = createRoute({
  getParentRoute: () => establishmentLayoutRoute,
  path: paths.app.establishments.add.path,
  staticData: {
    breadcrumb: [
      ESTABLECIMIENTO_CRUMB,
      { label: "Establecimiento", to: paths.app.establishments.general.getHref() },
      { label: "Agregar" },
    ],
  },
  component: AddEstablishmentPage,
})

export const editEstablishmentRoute = createRoute({
  getParentRoute: () => establishmentLayoutRoute,
  path: paths.app.establishments.edit.path,
  // El `establishmentId` es un identificador opaco: no se muestra como miga.
  staticData: {
    breadcrumb: [
      ESTABLECIMIENTO_CRUMB,
      { label: "Establecimiento", to: paths.app.establishments.general.getHref() },
      { label: "Editar" },
    ],
  },
  component: AddEstablishmentPage,
})

export const gestionDocumentalRoute = createRoute({
  getParentRoute: () => menuGuardRoute,
  path: paths.app.gestionDocumental.path,
  staticData: {
    breadcrumb: [MONITOREO_CRUMB, { label: "Gestión documental" }],
  },
  component: DocumentManagementPage,
})

export const gestionDocumentalFechaLimiteRoute = createRoute({
  getParentRoute: () => menuGuardRoute,
  path: paths.app.gestionDocumentalFechaLimite.path,
  staticData: {
    breadcrumb: [ADMINISTRACION_CRUMB, { label: "Fecha límite de Gestión documental" }],
  },
  component: DocumentDeadlinePage,
})

// Anexos de un tipo puntual (V521: los 4 tipos van por categorías). Si
// alguien entra con una URL de un tipo inexistente a mano, lo mandamos de
// vuelta al listado en vez de mostrar una pantalla que no resuelve nada.
const DOCUMENT_TYPES_WITH_ROUTE = ["PEI", "PEC", "PMI", "PFI"] as const

export const gestionDocumentalDetalleRoute = createRoute({
  getParentRoute: () => menuGuardRoute,
  path: paths.app.gestionDocumentalDetalle.path,
  beforeLoad: ({ params }) => {
    if (!DOCUMENT_TYPES_WITH_ROUTE.includes(params.tipo as (typeof DOCUMENT_TYPES_WITH_ROUTE)[number])) {
      throw redirect({ to: paths.app.gestionDocumental.getHref() })
    }
  },
  staticData: {
    breadcrumb: (params: Record<string, string>) => [
      MONITOREO_CRUMB,
      { label: "Gestión documental", to: paths.app.gestionDocumental.getHref() },
      { label: documentTypeDisplayName(params.tipo as "PEI" | "PEC" | "PMI" | "PFI") },
    ],
  },
  component: DocumentCategoryDetailPage,
})

export const monitoreoCumplimientoRoute = createRoute({
  getParentRoute: () => menuGuardRoute,
  path: paths.app.monitoreoCumplimiento.path,
  staticData: {
    breadcrumb: [MONITOREO_CRUMB, { label: "Monitoreo y cumplimiento" }],
  },
  component: MonitoringCompliancePage,
})

export const visorRoute = createRoute({
  getParentRoute: () => menuGuardRoute,
  path: paths.app.visor.path,
  validateSearch: visorSearchSchema,
  staticData: {
    breadcrumb: [MONITOREO_CRUMB, { label: "Visor de PDF" }],
  },
  component: PdfViewerPage,
})

// Cuelga de `appLayoutRoute`, NO de `menuGuardRoute`: es el destino del guard
// (si pasara por él, se rebotaría a sí misma) y tiene que verse con el
// sidebar del usuario.
export const unauthorizedRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.unauthorized.path,
  validateSearch: unauthorizedSearchSchema,
  staticData: { breadcrumb: [{ label: "Sin acceso" }] },
  component: UnauthorizedPage,
})

const routeTree = rootRoute.addChildren([
  //  landingRoute,
  homeRoute,
  authLayoutRoute.addChildren([
    loginRoute,
    forgotPasswordRoute,
    forgotUsernameRoute,
    checkEmailRoute,
    restorePasswordRoute,
    activateRoute,
  ]),
  appLayoutRoute.addChildren([
    // Sin guard de menú: el índice (redirige al primer ítem del menú) y el
    // propio destino del guard.
    appIndexRoute,
    unauthorizedRoute,
    // Todo módulo va acá adentro: ver `menuGuardRoute`. Cada ruta nueva
    // necesita además su menú dueño (URL del ítem, o `ROUTE_MENU_OWNERS` en
    // `features/navigation/lib/route-access.ts`) y su fila en el test.
    menuGuardRoute.addChildren([
      rolesMenusRoute,
      actividadUsuariosRoute,
      auditsLayoutRoute.addChildren([
        auditoriaSesionesRoute,
        auditoriaTablasRoute,
        auditoriaTablaDetalleRoute,
        auditoriaSesionOperacionesRoute,
      ]),
      establishmentLayoutRoute.addChildren([
        establishmentsRoute,
        campusesRoute,
        employeesRoute,
        addEstablishmentRoute,
        editEstablishmentRoute,
      ]),
      gestionDocumentalRoute,
      gestionDocumentalDetalleRoute,
      gestionDocumentalFechaLimiteRoute,
      monitoreoCumplimientoRoute,
      visorRoute,
    ]),
  ]),
])

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: "intent",
  scrollRestoration: true,
  defaultStructuralSharing: true,
  defaultNotFoundComponent: NotFoundPage,
  defaultErrorComponent: ErrorPage,
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
