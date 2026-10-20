import { Button, Page } from "@/components/ui"

export function ComposerExtras({ data, onAction }) {
  return (
    <Page><Button name="extras-toggle" onClick={() => onAction("open")} label="Emoji and stickers">☺</Button></Page>
  )
}
