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

export function NoticeProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<ActiveNotice | null>(null)
  const idRef = useRef(0)

  useEffect(() => {
    activeNoticeProviders += 1
    setSuppressGlobalErrorToast(true)
    return () => {
      activeNoticeProviders -= 1
      if (activeNoticeProviders === 0) setSuppressGlobalErrorToast(false)
    }
  }, [])

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

  const dismiss = useCallback(() => setNotice(null), [])

  const dispatch = useMemo(() => ({ notify, dismiss }), [notify, dismiss])

  return (
    <NoticeDispatchContext.Provider value={dispatch}>
      <NoticeStateContext.Provider value={notice}>{children}</NoticeStateContext.Provider>
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
