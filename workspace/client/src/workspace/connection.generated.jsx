import { Button, Card, Heading, Image, Link, Page, Text } from "@/components/ui"

export function ChatConnection({ data, onAction }) {
  return (
    <Page>
      <Card>
        <Image src="img/my_chat.svg" alt="Chat" />
        <Heading level={1}>Your conversations, together.</Heading>
        <Text>Chat connects with your One Workspace sign-in.</Text>
        <Text>If the connection stops, retry to continue with MyAccounts.</Text>
        <Button variant="primary" onClick={() => onAction("retry")}>Reconnect Chat</Button>
        <Link href="/">Back to Workspace</Link>
      </Card>
    </Page>
  )
}
