import { Button, Image, Page, Section } from "@/components/ui"

export function ChatRail({ data, onAction }) {
  return (
    <Page>
      <Image src="img/my_chat.svg" alt="Chat" />
      <Section name="primary-navigation">
        <Button name="navigation" value="chats" icon="chat_bubble" onClick={() => onAction("chats")}>Chats</Button>
        <Button name="navigation" value="new-chat" icon="add_comment" onClick={() => onAction("new-chat")}>New chat</Button>
        <Button name="navigation" value="archive" icon="archive" onClick={() => onAction("archive")}>Archived</Button>
        <Button name="navigation" value="profile" icon="person" onClick={() => onAction("profile")}>Profile</Button>
      </Section>
      <Section name="secondary-navigation">
        <Button name="navigation" value="settings" icon="settings" onClick={() => onAction("settings")}>Settings</Button>
        <Button name="navigation" value="appearance" icon="contrast" onClick={() => onAction("appearance")}>Appearance</Button>
        {data.workspace && (
          <Button name="navigation" value="workspace" icon="apps" onClick={() => onAction("workspace")}>Workspace</Button>
        )}
      </Section>
    </Page>
  )
}
