import { Alert, Button, Heading, Image, Page, Row, Section } from "@/components/ui"

export function EmojiStickers({ data, onAction }) {
  return (
    <Page>
      <Row name="dialog-header">
        <Heading level={2}>Emoji and stickers</Heading>
        <Button name="dialog-close" icon="close" label="Close emoji and stickers" onClick={() => onAction("close")} />
      </Row>
      <Section name="dialog-body">
        <Heading level={3}>Emoji</Heading>
        <Section name="emoji-grid">
          {data.emoji.map((item, i) => (
            <Button key={i} name="emoji" value={item} label={item} onClick={() => onAction("emoji")}>{item}</Button>
          ))}
        </Section>
        <Heading level={3}>Workspace stickers</Heading>
        <Section name="sticker-grid">
          {data.stickers.map((item, i) => (
            <Button key={i} name="sticker" value={item.id} label={item.label} onClick={() => onAction("sticker")}><Image src={item.src} alt={item.label} /></Button>
          ))}
        </Section>
      </Section>
      {data.error && (
        <Alert>{data.error}</Alert>
      )}
    </Page>
  )
}
