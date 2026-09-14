import { useState } from "react"

import { Button } from "@/components/ui/button"
import { ControlPointIcon } from "@/components/ui/icons"

import { ManageEmployeeDialog } from "@/features/establishment/employees/components/dialogs/dialog-manage"
import { EmployeesDataTable } from "@/features/establishment/employees/components/table/table-employees"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

export function EmployeesPage() {
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingEmployeeId, setEditingEmployeeId] = useState<number | null>(null)
  const { puedeCrear } = useMenuPermission("FUNCIONARIOS")

  function openCreateDialog() {
    setEditingEmployeeId(null)
    setEditorOpen(true)
  }

  function openEditDialog(employeeId: number) {
    setEditingEmployeeId(employeeId)
    setEditorOpen(true)
  }

  return (
    <>
      <EmployeesDataTable
        onEditEmployee={openEditDialog}
        title="Funcionarios"
        action={
          puedeCrear ? (
            <Button variant="fill" color="primary" size="sm" onClick={openCreateDialog}>
              <ControlPointIcon data-icon="inline-start" />
              Agregar
            </Button>
          ) : undefined
        }
      />

      <ManageEmployeeDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        employeeId={editingEmployeeId}
      />
    </>
  )
}
