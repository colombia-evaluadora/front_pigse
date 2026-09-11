import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { toast } from "sonner"

import { NoticeBanner, type Notice, type NoticeVariant } from "@/components/notice/notice-banner"
import { setSuppressGlobalErrorToast } from "@/lib/api-client"

interface NotifyOptions {
  variant?: NoticeVariant
  autoCloseMs?: number
}

interface NoticeDispatch {
  notify: (message: string, options?: NotifyOptions) => void
  dismiss: () => void
}

const DEFAULT_AUTO_CLOSE: Record<NoticeVariant, number> = {
  info: 7000,
  success: 7000,
  error: 12000,
}

const FALLBACK: NoticeDispatch = {
  notify: (message, options) => {
    if (options?.variant === "error") toast.error(message)
    else toast.success(message)
  },
  dismiss: () => {},
}

interface ActiveNotice extends Notice {
  variant: NoticeVariant
  autoCloseMs: number
}

const NoticeDispatchContext = createContext<NoticeDispatch>(FALLBACK)
const NoticeStateContext = createContext<ActiveNotice | null>(null)

export function useNotify(): NoticeDispatch {
  return useContext(NoticeDispatchContext)
}

let activeNoticeProviders = 0

/**
 * Aviso encolado para el `NoticeProvider` que monte a continuación —
 * variable de módulo, no estado de React: sobrevive porque es una SPA (no
 * hay reload de página entre rutas), pero SÍ se pierde el `NoticeProvider`
 * actual, que es por pantalla.
 *
 * Existe para el patrón "guardar y navegar" (crear/editar actividad o
 * unidad, `onSuccess` → `notify(...)` → `navigate(...)`): un `notify()`
 * normal ahí actualiza el estado del `NoticeProvider` de la pantalla que se
 * está por DESMONTAR, así que el aviso nunca llega a pintarse. `queueNotice`
 * lo guarda para que el `NoticeProvider` de la pantalla de DESTINO lo
 * muestre apenas se monta.
 */
let pendingNotice: { message: string; options?: NotifyOptions } | null = null

export function queueNotice(message: string, options?: NotifyOptions) {
  pendingNotice = { message, options }
}

export function NoticeProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<ActiveNotice | null>(null)
  const idRef = useRef(0)

  const notify = useCallback((message: string, options?: NotifyOptions) => {
    const variant = options?.variant ?? "success"
    idRef.current += 1
    setNotice({
      id: idRef.current,
      message,
      variant,
      autoCloseMs: options?.autoCloseMs ?? DEFAULT_AUTO_CLOSE[variant],
    })
  }, [])

  useEffect(() => {
    activeNoticeProviders += 1
    setSuppressGlobalErrorToast(true)
    // `pendingNotice` es una variable de MÓDULO, compartida por cualquier
    // `NoticeProvider` que esté montado al mismo tiempo (StrictMode
    // re-invoca este efecto, y dos pantallas pueden solaparse un instante
    // durante la navegación) — chequear `if (pendingNotice)` y leerla de
    // nuevo en la línea siguiente no es atómico: otro montaje puede
    // vaciarla en el medio y dejar `queued` en `null` justo antes de
    // `queued.message`. Se captura y se vacía en una sola operación, y se
    // chequea la copia LOCAL (no la global) antes de usarla.
    const queued = pendingNotice
    pendingNotice = null
    if (queued) {
      notify(queued.message, queued.options)
    }
    return () => {
      activeNoticeProviders -= 1
      if (activeNoticeProviders === 0) setSuppressGlobalErrorToast(false)
    }
  }, [notify])

  const dismiss = useCallback(() => setNotice(null), [])

  const dispatch = useMemo(() => ({ notify, dismiss }), [notify, dismiss])

  return (
    <NoticeDispatchContext.Provider value={dispatch}>
      <NoticeStateContext.Provider value={notice}>
        {children}
      </NoticeStateContext.Provider>
    </NoticeDispatchContext.Provider>
  )
}

export function NoticeOutlet({ className }: { className?: string }) {
  const notice = useContext(NoticeStateContext)
  const { dismiss } = useContext(NoticeDispatchContext)

  return (
    <NoticeBanner
      key={notice?.id}
      notice={notice}
      onClose={dismiss}
      variant={notice?.variant}
      autoCloseMs={notice?.autoCloseMs}
      className={className}
    />
  )
}
