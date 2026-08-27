import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import {
  BookOpenIcon,
  EnvelopeIcon,
  HeadsetIcon,
  PasswordIcon,
  PersonIcon,
  ShieldOffIcon,
  VideoIcon,
} from "@/components/ui/icons"

import { paths } from "@/config/paths"
import { Button } from "@/components/ui/button"

export interface HelpLink {
  title: string
  description: string
  icon: ReactNode
  to: string
}

export interface HelpFaq {
  id: string
  title: string
  description: string
  icon: ReactNode
  /**
   * Cuerpo del FAQ cuando se expande. `ReactNode` (no string) para poder
   * anidar `<Link>`, `<strong>`, `<br />`, etc. directo desde el data.
   */
  body: ReactNode
}

export interface HelpSection {
  title: string
  items: HelpLink[]
}

export interface HelpSupport {
  title: string
  icon: ReactNode
  email: string
  phone: string
  hours: string
}

export interface HelpSheetData {
  title: string
  description: string
  faqsTitle: string
  faqs: HelpFaq[]
  sections: HelpSection[]
  support: HelpSupport
}
export const defaultHelpData: HelpSheetData = {
  title: "¿Necesitas ayuda?",
  description: "Estamos aquí para ayudarte.",
  faqsTitle: "¿No puedes iniciar sesión?",
  faqs: [
    {
      id: "forgot-password",
      title: "Olvidé mi contraseña",
      description: "Restablece tu contraseña de forma segura.",
      icon: <PasswordIcon weight="duotone" className="text-green" />,
      body: (
        <p>
          Si olvidaste tu contraseña, selecciona <strong>"Recuperar contraseña"</strong>, ingresa tu
          correo institucional y sigue las instrucciones que recibirás para crear una nueva.
          <br />
          <Button variant="link" render={<Link to={paths.auth.forgotPassword.path} />}>
            Ir a recuperar contraseña
          </Button>
        </p>
      ),
    },
    {
      id: "forgot-username",
      title: "No recuerdo mi usuario",
      description: "Recupera tu usuario con tu documento o correo alternativo.",
      icon: <PersonIcon weight="duotone" className="text-blue" />,
      body: (
        <p>
          Si no recuerdas tu usuario, selecciona "Recuperar usuario" e ingresa tu número de
          documento o el correo electrónico registrado para consultarlo.
          <br />
          <Button variant="link" render={<Link to={paths.auth.forgotUsername.path} />}>
            Recuperar usuario
          </Button>
        </p>
      ),
    },
    {
      id: "blocked-account",
      title: "Mi cuenta está bloqueada",
      description: "Conoce por qué ocurre y cómo solicitar el desbloqueo.",
      icon: <ShieldOffIcon weight="duotone" className="text-orange" />,
      body: (
        <p>
          <strong>
            Tu cuenta ha sido bloqueada por disposición administrativa del establecimiento
            educativo.
          </strong>{" "}
          Para gestionar el desbloqueo, acércate al encargado del sistema en tu institución y
          presenta la solicitud correspondiente. Recuerda que el acceso solo será restablecido una
          vez validada la autorización por parte del área administrativa.
        </p>
      ),
    },
    {
      id: "no-recovery-email",
      title: "No recibí el correo de recuperación",
      description: "Revisa las posibles causas y solicita un nuevo envío.",
      icon: <EnvelopeIcon weight="duotone" className="text-purple" />,
      body: (
        <div className="space-y-3">
          <p>Verifica la carpeta de Spam o Correo no deseado.</p>
          <p>
            Si después de unos minutos no lo encuentras, acércate primero al encargado del sistema
            en tu establecimiento educativo para validar el estado de tu cuenta y solicitar el
            desbloqueo o nuevo envío.
          </p>
          <p>Solo en caso de requerir soporte adicional, podrás ser remitido a la mesa de ayuda.</p>
        </div>
      ),
    },
  ],
  sections: [
    {
      title: "Recursos",
      items: [
        {
          title: "Manual de usuario",
          description: "Guía paso a paso para usar la plataforma.",
          icon: <BookOpenIcon weight="duotone" className="text-green" />,
          to: "/",
        },
        {
          title: "Video: ¿Cómo ingresar por primera vez?",
          description: "Mira el tutorial en menos de 3 minutos.",
          icon: <VideoIcon weight="duotone" className="text-red" />,
          to: "/",
        },
      ],
    },
  ],
  support: {
    title: "Mesa de ayuda",
    icon: <HeadsetIcon weight="duotone" className="text-blue" />,
    email: "soporte@colombiaevaluadora.edu.co",
    phone: "+57(601)1234567",
    hours: "Lunes a viernes · 8:00 a. m. a 6:00 p. m.",
  },
}
