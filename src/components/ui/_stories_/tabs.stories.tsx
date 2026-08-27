import preview from "../../../../.storybook/preview"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/navigation/tabs"

const meta = preview.meta({
  title: "Design System/Navigation/Tabs",
  component: Tabs,
  tags: ["autodocs"],
})

export const Default = meta.story({
  render: () => (
    <Tabs defaultValue="account" className="w-80">
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
      </TabsList>
      <TabsContent value="account">Account settings go here.</TabsContent>
      <TabsContent value="password">Password settings go here.</TabsContent>
    </Tabs>
  ),
})

export const LineVariant = meta.story({
  render: () => (
    <Tabs defaultValue="account" className="w-80">
      <TabsList variant="line">
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
      </TabsList>
      <TabsContent value="account">Account settings go here.</TabsContent>
      <TabsContent value="password">Password settings go here.</TabsContent>
    </Tabs>
  ),
})

export const FolderVariant = meta.story({
  render: () => (
    <Tabs defaultValue="periods" className="w-full max-w-3xl">
      <TabsList variant="folder">
        <TabsTrigger value="periods">Periodos de evaluación</TabsTrigger>
        <TabsTrigger value="promotion">Criterios de promoción</TabsTrigger>
        <TabsTrigger value="grades">Grados</TabsTrigger>
        <TabsTrigger value="scales">Escalas de valoración</TabsTrigger>
      </TabsList>
      <TabsContent
        value="periods"
        className="rounded-b-lg rounded-tr-lg border p-6 group-data-[tabs-filled=true]/tabs:rounded-tr-none"
      >
        Periodos de evaluación
      </TabsContent>
      <TabsContent
        value="promotion"
        className="rounded-b-lg rounded-tr-lg border p-6 group-data-[tabs-filled=true]/tabs:rounded-tr-none"
      >
        Criterios de promoción
      </TabsContent>
      <TabsContent
        value="grades"
        className="rounded-b-lg rounded-tr-lg border p-6 group-data-[tabs-filled=true]/tabs:rounded-tr-none"
      >
        Grados
      </TabsContent>
      <TabsContent
        value="scales"
        className="rounded-b-lg rounded-tr-lg border p-6 group-data-[tabs-filled=true]/tabs:rounded-tr-none"
      >
        Escalas de valoración
      </TabsContent>
    </Tabs>
  ),
})

export const Vertical = meta.story({
  render: () => (
    <Tabs defaultValue="account" orientation="vertical" className="w-96">
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
      </TabsList>
      <TabsContent value="account">Account settings go here.</TabsContent>
      <TabsContent value="password">Password settings go here.</TabsContent>
    </Tabs>
  ),
})
