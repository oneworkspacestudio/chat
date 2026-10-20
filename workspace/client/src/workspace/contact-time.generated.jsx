import { Page, Text } from "@/components/ui"

export function ContactTime({ data, onAction }) {
  return (
    <Page><Text name="inline">{data.time}</Text></Page>
  )
}
