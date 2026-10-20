import { Button, Heading, Image, Page, Text } from "@/components/ui"

export function ChatListEmpty({ data, onAction }) {
  return (
    <Page>
      <Image src="img/my_chat.svg" alt="" />
      <Heading level={2}>{data.title}</Heading>
      <Text>{data.description}</Text>
      {data.compose && (
        <Button onClick={() => onAction("new-chat")}>Start a chat</Button>
      )}
    </Page>
  )
}
