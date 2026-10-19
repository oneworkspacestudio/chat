import { Heading, Image, Page, Text } from "@/components/ui"

export function ChatEmpty({ data, onAction }) {
  return (
    <Page>
      <Image src="img/my_chat.svg" alt="Chat" />
      <Heading level={2}>Your conversations, together.</Heading>
      <Text>Choose a conversation or start a new chat.</Text>
      <Text>Your messages and files stay on your Workspace server.</Text>
    </Page>
  )
}
