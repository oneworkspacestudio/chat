import { Button, Page, Row } from "@/components/ui"

export function MobileNav({ data, onAction }) {
  return (
    <Page>
      <Row name="mobile-tabs">
        <Button name="navigation" value="chats" icon="chat_bubble" onClick={() => onAction("chats")}>Chats</Button>
        <Button name="navigation" value="archive" icon="archive" onClick={() => onAction("archive")}>Archived</Button>
        <Button name="navigation" value="settings" icon="settings" onClick={() => onAction("settings")}>Settings</Button>
      </Row>
      {data.compose && (
        <Button name="mobile-compose" icon="add_comment" label="New chat" onClick={() => onAction("new-chat")} />
      )}
    </Page>
  )
}
