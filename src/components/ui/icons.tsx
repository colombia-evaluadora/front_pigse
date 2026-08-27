import type { ReactElement } from "react"
import type { IconBaseProps, IconType } from "react-icons"
import { GoShieldLock } from "react-icons/go"
import {
  MdAccessTime,
  MdOutlineAccountBalance,
  MdAccountCircle,
  MdAdd,
  MdAddCircleOutline,
  MdApartment,
  MdArrowBack,
  MdArrowDownward,
  MdArrowForward,
  MdArrowUpward,
  MdAssignment,
  MdAssignmentAdd,
  MdAssignmentTurnedIn,
  MdAttachFile,
  MdAttachMoney,
  MdAutorenew,
  MdBackspace,
  MdBadge,
  MdBolt,
  MdBarChart,
  MdBubbleChart,
  MdCalendarMonth,
  MdCalendarToday,
  MdCancel,
  MdCancelPresentation,
  MdChat,
  MdChatBubbleOutline,
  MdCheck,
  MdCircle,
  MdClose,
  MdContacts,
  MdContrast,
  MdCoPresent,
  MdCreditCard,
  MdDarkMode,
  MdDescription,
  MdDragIndicator,
  MdOutlineFileDownload,
  MdOutlineBorderColor,
  MdOutlineDelete,
  MdEmojiEvents,
  MdEvent,
  MdExplore,
  MdOutlineChromeReaderMode,
  MdOutlineControlPoint,
  MdOutlineImage,
  MdOutlineEmail,
  MdErrorOutline,
  MdOutlineFilterList,
  MdFolderOpen,
  MdFormatBold,
  MdFormatItalic,
  MdFormatListNumbered,
  MdFormatUnderlined,
  MdGavel,
  MdGroup,
  MdGroupAdd,
  MdGroups,
  MdHelpOutline,
  MdHome,
  MdHomeWork,
  MdInfoOutline,
  MdKey,
  MdKeyboardArrowDown,
  MdKeyboardArrowLeft,
  MdKeyboardArrowRight,
  MdKeyboardArrowUp,
  MdLightMode,
  MdLinkOff,
  MdLockOutline,
  MdLogin,
  MdLogout,
  MdManageSearch,
  MdMap,
  MdMenu,
  MdMenuBook,
  MdMilitaryTech,
  MdMoreHoriz,
  MdOutlineAdminPanelSettings,
  MdOutlinePassword,
  MdOutlineShield,
  MdPalette,
  MdPark,
  MdPeople,
  MdPictureAsPdf,
  MdPersonOutline,
  MdPlace,
  MdPsychology,
  MdPublic,
  MdRadioButtonUnchecked,
  MdRefresh,
  MdRemove,
  MdOutlineRemoveModerator,
  MdSchool,
  MdSearch,
  MdOutlineSend,
  MdSettings,
  MdOutlineSmartDisplay,
  MdOutlineNotifications,
  MdSupportAgent,
  MdTableChart,
  MdTimelapse,
  MdTransgender,
  MdTrendingUp,
  MdUnfoldMore,
  MdVerifiedUser,
  MdViewColumn,
  MdVisibility,
  MdVisibilityOff,
  MdWarningAmber,
  MdCheckCircleOutline,
} from "react-icons/md"

/**
 * Props de un ícono. Extiende las de `react-icons` (className, style, size,
 * data-*, aria-*, etc.) y tolera `weight` por compatibilidad con la API de
 * Phosphor — Material Icons no tiene pesos, así que se acepta pero se ignora.
 */
export type IconProps = IconBaseProps & {
  weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone"
}

/** Tipo de un componente de ícono (reemplaza al `Icon` de Phosphor). */
export type Icon = (props: IconProps) => ReactElement

// Envuelve un ícono de react-icons para descartar `weight` (Phosphor) y dejar
// pasar el resto de props al `<svg>`. Mantiene el tree-shaking: solo se
// incluyen en el bundle los `Md*` realmente importados arriba.
function makeIcon(Base: IconType): Icon {
  return function IconWrapper({ weight: _weight, ...props }: IconProps) {
    return <Base {...props} />
  }
}

export const AddressBookIcon = makeIcon(MdContacts)
export const AdminPanelSettingsIcon = makeIcon(MdOutlineAdminPanelSettings)
export const ArrowCounterClockwiseIcon = makeIcon(MdRefresh)
export const ArrowDownIcon = makeIcon(MdArrowDownward)
export const ArrowLeftIcon = makeIcon(MdArrowBack)
export const ArrowRightIcon = makeIcon(MdArrowForward)
export const ArrowUpIcon = makeIcon(MdArrowUpward)
export const BankIcon = makeIcon(MdOutlineAccountBalance)
export const BellIcon = makeIcon(MdOutlineNotifications)
export const BookIcon = makeIcon(MdMenuBook)
export const BookOpenIcon = makeIcon(MdOutlineChromeReaderMode)
export const BrainIcon = makeIcon(MdPsychology)
export const BuildingsIcon = makeIcon(MdApartment)
export const CalendarBlankIcon = makeIcon(MdCalendarToday)
export const CalendarDotsIcon = makeIcon(MdEvent)
export const CalendarIcon = makeIcon(MdCalendarMonth)
export const ChalkboardTeacherIcon = makeIcon(MdCoPresent)
export const ChartBarIcon = makeIcon(MdBarChart)
export const ChartLineUpIcon = makeIcon(MdTrendingUp)
export const CaretDownIcon = makeIcon(MdKeyboardArrowDown)
export const CaretLeftIcon = makeIcon(MdKeyboardArrowLeft)
export const CaretRightIcon = makeIcon(MdKeyboardArrowRight)
export const CaretUpDownIcon = makeIcon(MdUnfoldMore)
export const CaretUpIcon = makeIcon(MdKeyboardArrowUp)
export const ChatCircleDotsIcon = makeIcon(MdChatBubbleOutline)
export const ChatCircleTextIcon = makeIcon(MdChat)
export const CheckCircleIcon = makeIcon(MdCheckCircleOutline)
export const CheckIcon = makeIcon(MdCheck)
export const CircleDashedIcon = makeIcon(MdRadioButtonUnchecked)
export const CircleHalfIcon = makeIcon(MdContrast)
export const CircleIcon = makeIcon(MdCircle)
export const CirclesThreeIcon = makeIcon(MdBubbleChart)
export const ClipboardAddIcon = makeIcon(MdAssignmentAdd)
export const ClipboardCheckIcon = makeIcon(MdAssignmentTurnedIn)
export const ClipboardTextIcon = makeIcon(MdAssignment)
export const ClockCountdownIcon = makeIcon(MdTimelapse)
export const ClockIcon = makeIcon(MdAccessTime)
export const ColumnsIcon = makeIcon(MdViewColumn)
export const CompassIcon = makeIcon(MdExplore)
// Ícono de las acciones "Agregar" (crear un registro), para distinguirlas de
// `PlusIcon`/`PlusCircleIcon`, que se usan en sumas dentro de un formulario.
export const ControlPointIcon = makeIcon(MdOutlineControlPoint)
export const CreditCardIcon = makeIcon(MdCreditCard)
export const CurrencyDollarIcon = makeIcon(MdAttachMoney)
// Manija de arrastre (los seis puntitos): marca las filas que se reordenan.
export const DotsSixVerticalIcon = makeIcon(MdDragIndicator)
export const DotsThreeIcon = makeIcon(MdMoreHoriz)
export const EnvelopeIcon = makeIcon(MdOutlineEmail)
export const EraserIcon = makeIcon(MdBackspace)
export const EyeIcon = makeIcon(MdVisibility)
export const EyeSlashIcon = makeIcon(MdVisibilityOff)
// `FileDownloadOutlined` de MUI: el de las acciones de exportar.
export const FileDownloadOutlinedIcon = makeIcon(MdOutlineFileDownload)
export const FilePdfIcon = makeIcon(MdPictureAsPdf)
export const FileTextIcon = makeIcon(MdDescription)
export const FileXlsIcon = makeIcon(MdTableChart)
export const FolderOpenIcon = makeIcon(MdFolderOpen)
export const FunnelIcon = makeIcon(MdOutlineFilterList)
export const GavelIcon = makeIcon(MdGavel)
export const GearIcon = makeIcon(MdSettings)
export const GenderIntersexIcon = makeIcon(MdTransgender)
export const GlobeIcon = makeIcon(MdPublic)
export const GraduationCapIcon = makeIcon(MdSchool)
export const HeadsetIcon = makeIcon(MdSupportAgent)
export const HouseIcon = makeIcon(MdHome)
export const HouseLineIcon = makeIcon(MdHomeWork)
export const IdentificationCardIcon = makeIcon(MdBadge)
export const ImageIcon = makeIcon(MdOutlineImage)
export const InfoIcon = makeIcon(MdInfoOutline)
export const KeyIcon = makeIcon(MdKey)
export const LightningIcon = makeIcon(MdBolt)
export const LockIcon = makeIcon(MdLockOutline)
export const LinkBreakIcon = makeIcon(MdLinkOff)
export const ListMagnifyingGlassIcon = makeIcon(MdManageSearch)
export const ListNumbersIcon = makeIcon(MdFormatListNumbered)
export const MagnifyingGlassIcon = makeIcon(MdSearch)
export const MapPinIcon = makeIcon(MdPlace)
export const MapTrifoldIcon = makeIcon(MdMap)
export const MedalIcon = makeIcon(MdMilitaryTech)
export const MinusIcon = makeIcon(MdRemove)
export const MoonIcon = makeIcon(MdDarkMode)
export const NotebookIcon = makeIcon(MdMenuBook)
export const PaletteIcon = makeIcon(MdPalette)
export const PasswordIcon = makeIcon(MdOutlinePassword)
export const PaperPlaneTiltIcon = makeIcon(MdOutlineSend)
export const PaperclipIcon = makeIcon(MdAttachFile)
// Equivalentes de `BorderColorOutlined` y `DeleteOutlined` de MUI: los dos
// vienen del mismo set (Material), así que `react-icons/md` los trae con el
// prefijo `MdOutline`. Se repunta acá y no en cada uso para que el lápiz y el
// tacho sean los mismos en toda la app (acciones de fila, diálogos, filtros).
export const PencilIcon = makeIcon(MdOutlineBorderColor)
export const PlusCircleIcon = makeIcon(MdAddCircleOutline)
export const PlusIcon = makeIcon(MdAdd)
export const QuestionIcon = makeIcon(MdHelpOutline)
export const ShieldCheckIcon = makeIcon(MdVerifiedUser)
export const ShieldIcon = makeIcon(MdOutlineShield)
export const ShieldOffIcon = makeIcon(MdOutlineRemoveModerator)
export const ShieldLockIcon = makeIcon(GoShieldLock)
export const SidebarIcon = makeIcon(MdMenu)
export const SignInIcon = makeIcon(MdLogin)
export const SignOutIcon = makeIcon(MdLogout)
export const SpinnerIcon = makeIcon(MdAutorenew)
export const SunIcon = makeIcon(MdLightMode)
export const TextBIcon = makeIcon(MdFormatBold)
export const TextItalicIcon = makeIcon(MdFormatItalic)
export const TextUnderlineIcon = makeIcon(MdFormatUnderlined)
export const TrashIcon = makeIcon(MdOutlineDelete)
export const TreeIcon = makeIcon(MdPark)
export const TrophyIcon = makeIcon(MdEmojiEvents)
export const VideoIcon = makeIcon(MdOutlineSmartDisplay)
export const PersonIcon = makeIcon(MdPersonOutline)
export const UserCircleIcon = makeIcon(MdAccountCircle)
export const UserGroupAddIcon = makeIcon(MdGroupAdd)
export const UserIcon = makeIcon(MdPersonOutline)
export const UsersIcon = makeIcon(MdGroup)
export const UsersFourIcon = makeIcon(MdPeople)
export const UsersThreeIcon = makeIcon(MdGroups)
export const WarningCircleIcon = makeIcon(MdErrorOutline)
export const WarningIcon = makeIcon(MdWarningAmber)
export const XCircleIcon = makeIcon(MdCancel)
export const XIcon = makeIcon(MdClose)
export const XSquareIcon = makeIcon(MdCancelPresentation)
