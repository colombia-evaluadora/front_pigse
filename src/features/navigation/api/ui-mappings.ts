import * as PhosphorIcons from "@/components/ui/icons"
import { QuestionIcon, type Icon } from "@/components/ui/icons"

const iconRegistry = PhosphorIcons as unknown as Record<string, Icon>

// Los menús legacy guardan clases de FontAwesome ("fas fa-graduation-cap"):
// los prefijos de familia no dicen nada del dibujo, así que se descartan y
// queda el nombre del ícono.
const FONT_AWESOME_PREFIXES = new Set(["fa", "fas", "far", "fab", "fal", "fad"])

// Nombres de FontAwesome que no coinciden con ningún export del barrel. Se
// mapean al equivalente más cercano en vez de caer al genérico.
const FONT_AWESOME_ALIASES: Record<string, string> = {
  cog: "GearIcon",
  cogs: "GearIcon",
  university: "BankIcon",
  archive: "FolderOpenIcon",
  print: "FileTextIcon",
  desktop: "ChalkboardTeacherIcon",
  comments: "ChatCircleTextIcon",
  "chart-pie": "ChartBarIcon",
  "chart-line": "ChartLineUpIcon",
  "chart-bar": "ChartBarIcon",
  "tachometer-alt": "ChartLineUpIcon",
  "calendar-alt": "CalendarIcon",
  "list-ol": "ListNumbersIcon",
  "file-alt": "FileTextIcon",
  "id-card": "IdentificationCardIcon",
  "address-card": "AddressBookIcon",
  "window-restore": "ColumnsIcon",
  history: "ClockCountdownIcon",
  database: "TreeIcon",
  // Iconos que manda el backend de PIGSE en `public.route.icon`
  // (minúscula, sin sufijo). No existen como export con ese nombre
  // exacto en el barrel, así que se mapean al más cercano.
  folder: "FolderOpenIcon",
  chart: "ChartBarIcon",
}

/**
 * Resuelve el nombre de ícono que manda el backend al export PascalCase+Icon
 * del barrel. Convive con tres convenciones: la de los menús nuevos y el mock
 * ("Book-Open-Icon"), la del SSO —minúsculas y sin sufijo ("user", "book")— y
 * la de los menús legacy de eval-col, que son clases de FontAwesome
 * ("fas fa-graduation-cap").
 */
export function getNavIcon(iconName: string | null | undefined): Icon {
  // Un menú sin ícono cargado no es un error de mapeo: el backend deja `icon`
  // en null para varios grupos. Se pinta el genérico y no se avisa.
  if (!iconName) return QuestionIcon

  // "fas fa-graduation-cap" → "graduation-cap"
  const bare = iconName
    .trim()
    .split(/\s+/)
    .map((token) => (token.startsWith("fa-") ? token.slice("fa-".length) : token))
    .filter((token) => !FONT_AWESOME_PREFIXES.has(token))
    .join(" ")

  const alias = FONT_AWESOME_ALIASES[bare]
  if (alias && iconRegistry[alias]) return iconRegistry[alias]

  const pascal = bare
    .split(/[-_\s]+|(?<=[a-z0-9])(?=[A-Z])/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join("")
  const componentName = pascal.endsWith("Icon") ? pascal : `${pascal}Icon`
  const Icon = iconRegistry[componentName]

  if (!Icon) {
    console.warn(`[navigation] ícono desconocido del backend: "${iconName}"`)
    return QuestionIcon
  }

  return Icon
}
