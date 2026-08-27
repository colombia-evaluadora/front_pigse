import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/overlay/accordion"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { CaretRightIcon, QuestionIcon } from "@/components/ui/icons"

import {
  defaultHelpData,
  type HelpFaq,
  type HelpSection,
  type HelpSheetData,
  type HelpSupport,
} from "@/features/auth/components/sheets/help-faq-data"

import { Button } from "@/components/ui/button"

export function HelpFaqSheet({ data = defaultHelpData }: { data?: HelpSheetData }) {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            color="primary"
            size="sm"
            className="tracking-normal normal-case"
            aria-label={data.title}
          />
        }
      >
        <QuestionIcon weight="duotone" className="size-4.5 text-primary" aria-hidden="true" />
        <span>{data.title}</span>
      </SheetTrigger>

      <SheetContent>
        <SheetHeader>
          <SheetTitle>{data.title}</SheetTitle>
          <SheetDescription>{data.description}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 pb-6">
          <HelpFaqSection title={data.faqsTitle} faqs={data.faqs} />

          {data.sections.map((section) => (
            <HelpLinkSection key={section.title} section={section} />
          ))}

          <HelpSupportSection support={data.support} />
        </div>
      </SheetContent>
    </Sheet>
  )
}

function HelpBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h3 className="text-base font-semibold">{title}</h3>
      {children}
    </section>
  )
}

function HelpFaqSection({ title, faqs }: { title: string; faqs: HelpFaq[] }) {
  return (
    <HelpBlock title={title}>
      <Accordion className="rounded-lg border">
        {faqs.map((faq) => (
          <AccordionItem key={faq.id} value={faq.id}>
            <AccordionTrigger>
              <ItemMedia variant="icon-lg">{faq.icon}</ItemMedia>
              <ItemContent>
                <ItemTitle>{faq.title}</ItemTitle>
                <ItemDescription>{faq.description}</ItemDescription>
              </ItemContent>
            </AccordionTrigger>
            <AccordionContent>{faq.body}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </HelpBlock>
  )
}

function HelpLinkSection({ section }: { section: HelpSection }) {
  return (
    <HelpBlock title={section.title}>
      <ItemGroup variant="list">
        {section.items.map((item) => (
          <Item key={item.title} render={<Link to={item.to} />}>
            <ItemMedia variant="icon-lg">{item.icon}</ItemMedia>
            <ItemContent>
              <ItemTitle>{item.title}</ItemTitle>
              <ItemDescription>{item.description}</ItemDescription>
            </ItemContent>
            <ItemActions>
              <CaretRightIcon className="size-4 text-muted-foreground" />
            </ItemActions>
          </Item>
        ))}
      </ItemGroup>
    </HelpBlock>
  )
}

function HelpSupportSection({ support }: { support: HelpSupport }) {
  const emailLink = `mailto:${support.email}`
  const phoneLink = `tel:${support.phone}`
  return (
    <HelpBlock title="Soporte">
      <Item variant="outline" className="rounded-lg">
        <ItemMedia variant="icon-lg">{support.icon}</ItemMedia>
        <ItemContent>
          <ItemTitle>{support.title}</ItemTitle>
          <ItemDescription className="flex flex-col space-y-1">
            <Link to={emailLink}>{support.email}</Link>
            <Link to={phoneLink}>{support.phone}</Link>
            <p>{support.hours}</p>
          </ItemDescription>
        </ItemContent>
      </Item>
    </HelpBlock>
  )
}
