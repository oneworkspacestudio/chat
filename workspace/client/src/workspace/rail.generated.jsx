import { Button, Image, Page } from "@/components/ui"

export function ChatRail({ data, onAction }) {
  return (
    <Page>
      <Image src="img/my_chat.svg" alt="Chat" />
      <Button icon="chat_bubble" onClick={() => onAction("chats")}>Chats</Button>
      <Button icon="add_comment" onClick={() => onAction("new-chat")}>New chat</Button>
      <Button icon="archive" onClick={() => onAction("archive")}>Archived</Button>
      <Button icon="person" onClick={() => onAction("profile")}>Profile</Button>
      <Button icon="settings" onClick={() => onAction("settings")}>Settings</Button>
      <Button icon="contrast" onClick={() => onAction("appearance")}>Appearance</Button>
      {data.workspace && (
        <Button icon="apps" onClick={() => onAction("workspace")}>Workspace</Button>
      )}
    </Page>
  )
}
