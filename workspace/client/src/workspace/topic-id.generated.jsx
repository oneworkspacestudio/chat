import { Alert, Button, Field, Heading, Image, Input, Page, Section, Text } from "@/components/ui"

export function ChatById({ data, onAction }) {
  return (
    <Page>
      <Section>
        <Heading level={2}>Open a conversation</Heading>
        <Text>Paste a Chat ID or a tinode:///id/ link. Use Find to search by name, username or email.</Text>
        <Field label="Chat or group ID"><Input name="topicID" value={data.topicID} placeholder="usr... or grp..." /></Field>
        <Button variant="primary" onClick={() => onAction("open")}>Open chat</Button>
        {data.error && (
          <Alert>{data.error}</Alert>
        )}
      </Section>
      <Section>
        <Heading level={2}>Your Chat ID</Heading>
        <Text>{data.myID}</Text>
        <Button onClick={() => onAction("copy")}>Copy my ID</Button>
        {data.copied && (
          <Text>ID copied</Text>
        )}
        {data.qr && (
          <Image src={data.qr} alt="QR code for your Chat ID" />
        )}
      </Section>
    </Page>
  )
}
