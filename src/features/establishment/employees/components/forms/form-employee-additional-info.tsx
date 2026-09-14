import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
} from "@/components/ui/combobox"
import { CATALOGS } from "@/lib/catalogs"
import { toSelectItemsMap, toSelectOptions } from "@/lib/catalog-options"

import { useCatalogQuery } from "@/features/establishment/employees/api/query/use-catalogs"
import type { CatalogItem } from "@/types/catalog"
import type { Employee } from "@/features/establishment/employees/api/types/employee"

/**
 * "Información complementaria" del funcionario (V390, mismos 8 campos que
 * CEVAL: `form-employee-additional-info.tsx`) -- catálogos ya sembrados en
 * `pigse.TLISTA_VALOR`, servidos por el genérico `GET /select/:CATEGORIA`
 * que ya usa el resto de PIGSE.
 */
export interface EmployeeAdditionalInfoValue {
  employeeClass: CatalogItem | null
  educationLevel: CatalogItem | null
  grade: CatalogItem | null
  highestEducationLevel: CatalogItem | null
  fundingSource: CatalogItem | null
  functionalPosition: CatalogItem | null
  employmentType: CatalogItem | null
  address: string
}

interface EmployeeAdditionalInfoFormProps {
  value: EmployeeAdditionalInfoValue
  onChange: (value: EmployeeAdditionalInfoValue) => void
}

function pickOption(options: CatalogItem[], selectedId: number): CatalogItem | null {
  return options.find((option) => option.id === selectedId) ?? null
}

export function createAdditionalInfoFromEmployee(employee: Employee): EmployeeAdditionalInfoValue {
  return {
    employeeClass: employee.employeeClass,
    educationLevel: employee.educationLevel,
    grade: employee.grade,
    highestEducationLevel: employee.highestEducationLevel,
    fundingSource: employee.fundingSource,
    functionalPosition: employee.functionalPosition,
    employmentType: employee.employmentType,
    address: employee.address,
  }
}

export function EmployeeAdditionalInfoForm({ value, onChange }: EmployeeAdditionalInfoFormProps) {
  const { data: employeeClasses = [] } = useCatalogQuery<CatalogItem>(CATALOGS.EMPLOYEE_CLASSES)
  const { data: educationLevels = [] } = useCatalogQuery<CatalogItem>(CATALOGS.EDUCATION_LEVELS)
  const { data: highestEducationLevels = [] } = useCatalogQuery<CatalogItem>(
    CATALOGS.HIGHEST_EDUCATION_LEVELS,
  )
  const { data: grades = [] } = useCatalogQuery<CatalogItem>(CATALOGS.EMPLOYEE_GRADES)
  const { data: fundingSources = [] } = useCatalogQuery<CatalogItem>(CATALOGS.FUNDING_SOURCES)
  const { data: functionalPositions = [] } = useCatalogQuery<CatalogItem>(CATALOGS.FUNCTIONAL_POSITIONS)
  const { data: employmentTypes = [] } = useCatalogQuery<CatalogItem>(CATALOGS.EMPLOYMENT_TYPES)

  const employeeClassItems = toSelectItemsMap(toSelectOptions(employeeClasses))
  const educationLevelItems = toSelectItemsMap(toSelectOptions(educationLevels))
  const highestEducationLevelItems = toSelectItemsMap(toSelectOptions(highestEducationLevels))
  const gradeItems = toSelectItemsMap(toSelectOptions(grades))
  const fundingSourceItems = toSelectItemsMap(toSelectOptions(fundingSources))
  const functionalPositionItems = toSelectItemsMap(toSelectOptions(functionalPositions))
  const employmentTypeItems = toSelectItemsMap(toSelectOptions(employmentTypes))

  const patch = (partial: Partial<EmployeeAdditionalInfoValue>) => {
    onChange({ ...value, ...partial })
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Field orientation="vertical" variant="outlined">
        <FieldLabel htmlFor="employee-class">Clase de funcionario</FieldLabel>
        <ComboboxField
          id="employee-class"
          items={employeeClassItems}
          value={value.employeeClass?.id ?? null}
          onValueChange={(selectedValue) => {
            patch({ employeeClass: selectedValue === null ? null : pickOption(employeeClasses, selectedValue) })
          }}
        >
          <ComboboxFieldTrigger>
            <ComboboxFieldValue placeholder="Seleccionar" />
          </ComboboxFieldTrigger>
          <ComboboxFieldContent>
            {employeeClasses.map((item) => (
              <ComboboxFieldItem key={item.id} value={item.id} title={item.name}>
                {item.name}
              </ComboboxFieldItem>
            ))}
          </ComboboxFieldContent>
        </ComboboxField>
      </Field>

      <Field orientation="vertical" variant="outlined">
        <FieldLabel htmlFor="education-level">Nivel educativo de enseñanza</FieldLabel>
        <ComboboxField
          id="education-level"
          items={educationLevelItems}
          value={value.educationLevel?.id ?? null}
          onValueChange={(selectedValue) => {
            patch({ educationLevel: selectedValue === null ? null : pickOption(educationLevels, selectedValue) })
          }}
        >
          <ComboboxFieldTrigger>
            <ComboboxFieldValue placeholder="Seleccionar" />
          </ComboboxFieldTrigger>
          <ComboboxFieldContent>
            {educationLevels.map((item) => (
              <ComboboxFieldItem key={item.id} value={item.id} title={item.name}>
                {item.name}
              </ComboboxFieldItem>
            ))}
          </ComboboxFieldContent>
        </ComboboxField>
      </Field>

      <Field orientation="vertical" variant="outlined">
        <FieldLabel htmlFor="employee-grade">Grado escalafón</FieldLabel>
        <ComboboxField
          id="employee-grade"
          items={gradeItems}
          value={value.grade?.id ?? null}
          onValueChange={(selectedValue) => {
            patch({ grade: selectedValue === null ? null : pickOption(grades, selectedValue) })
          }}
        >
          <ComboboxFieldTrigger>
            <ComboboxFieldValue placeholder="Seleccionar" />
          </ComboboxFieldTrigger>
          <ComboboxFieldContent>
            {grades.map((item) => (
              <ComboboxFieldItem key={item.id} value={item.id} title={item.name}>
                {item.name}
              </ComboboxFieldItem>
            ))}
          </ComboboxFieldContent>
        </ComboboxField>
      </Field>

      <Field orientation="vertical" variant="outlined">
        <FieldLabel htmlFor="highest-education-level">Ultimo nivel educativo aprobado</FieldLabel>
        <ComboboxField
          id="highest-education-level"
          items={highestEducationLevelItems}
          value={value.highestEducationLevel?.id ?? null}
          onValueChange={(selectedValue) => {
            patch({
              highestEducationLevel:
                selectedValue === null ? null : pickOption(highestEducationLevels, selectedValue),
            })
          }}
        >
          <ComboboxFieldTrigger>
            <ComboboxFieldValue placeholder="Seleccionar" />
          </ComboboxFieldTrigger>
          <ComboboxFieldContent>
            {highestEducationLevels.map((item) => (
              <ComboboxFieldItem key={item.id} value={item.id} title={item.name}>
                {item.name}
              </ComboboxFieldItem>
            ))}
          </ComboboxFieldContent>
        </ComboboxField>
      </Field>

      <Field orientation="vertical" variant="outlined">
        <FieldLabel htmlFor="funding-source">Fuente de recursos</FieldLabel>
        <ComboboxField
          id="funding-source"
          items={fundingSourceItems}
          value={value.fundingSource?.id ?? null}
          onValueChange={(selectedValue) => {
            patch({ fundingSource: selectedValue === null ? null : pickOption(fundingSources, selectedValue) })
          }}
        >
          <ComboboxFieldTrigger>
            <ComboboxFieldValue placeholder="Seleccionar" />
          </ComboboxFieldTrigger>
          <ComboboxFieldContent>
            {fundingSources.map((item) => (
              <ComboboxFieldItem key={item.id} value={item.id} title={item.name}>
                {item.name}
              </ComboboxFieldItem>
            ))}
          </ComboboxFieldContent>
        </ComboboxField>
      </Field>

      <Field orientation="vertical" variant="outlined">
        <FieldLabel htmlFor="functional-position">Cargo funcional</FieldLabel>
        <ComboboxField
          id="functional-position"
          items={functionalPositionItems}
          value={value.functionalPosition?.id ?? null}
          onValueChange={(selectedValue) => {
            patch({
              functionalPosition: selectedValue === null ? null : pickOption(functionalPositions, selectedValue),
            })
          }}
        >
          <ComboboxFieldTrigger>
            <ComboboxFieldValue placeholder="Seleccionar" />
          </ComboboxFieldTrigger>
          <ComboboxFieldContent>
            {functionalPositions.map((item) => (
              <ComboboxFieldItem key={item.id} value={item.id} title={item.name}>
                {item.name}
              </ComboboxFieldItem>
            ))}
          </ComboboxFieldContent>
        </ComboboxField>
      </Field>

      <Field orientation="vertical" variant="outlined">
        <FieldLabel htmlFor="employment-type">Tipo de vinculación</FieldLabel>
        <ComboboxField
          id="employment-type"
          items={employmentTypeItems}
          value={value.employmentType?.id ?? null}
          onValueChange={(selectedValue) => {
            patch({ employmentType: selectedValue === null ? null : pickOption(employmentTypes, selectedValue) })
          }}
        >
          <ComboboxFieldTrigger>
            <ComboboxFieldValue placeholder="Seleccionar" />
          </ComboboxFieldTrigger>
          <ComboboxFieldContent>
            {employmentTypes.map((item) => (
              <ComboboxFieldItem key={item.id} value={item.id} title={item.name}>
                {item.name}
              </ComboboxFieldItem>
            ))}
          </ComboboxFieldContent>
        </ComboboxField>
      </Field>

      <Field orientation="vertical" variant="outlined">
        <FieldLabel htmlFor="employee-address">Dirección</FieldLabel>
        <Input
          id="employee-address"
          value={value.address}
          onChange={(event) => patch({ address: event.target.value })}
          placeholder="Agregar"
        />
      </Field>
    </div>
  )
}
