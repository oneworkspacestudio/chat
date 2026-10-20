import { Alert, Button, Heading, Page, Row, Section, Text } from "@/components/ui"

export function ContinuityDialog({ data, onAction }) {
  return (
    <Page>
      <Row name="dialog-header">
        <Heading level={2}>Keep chatting during an outage</Heading>
        <Button name="dialog-close" icon="close" label="Close direct fallback" onClick={() => onAction("close")} />
      </Row>
      <Section name="dialog-body">
        <Text>Chat automatically prepares connections for recent conversations. Keep writing here if the server stops. Text, emoji and bundled stickers are sent directly when the other person is reachable, then saved to Chat when it returns.</Text>
        <Text>Chat uses public discovery services to reconnect automatically, with no extra server to install. These services see connection metadata and encrypted connection details. Your network address may be visible to the other person.</Text>
        <Text>Connection permission lasts up to two hours and renews online. If a network blocks direct connections, messages stay queued until a route is available. Your administrator can add a TURN relay for those networks.</Text>
        <Text>Direct messages are stored on both devices. They are saved to Chat when the sender reconnects. This does not enable complete end-to-end encryption of server history.</Text>
        <Text>{data.status}</Text>
        {data.expires && (
          <Text>{data.expires}</Text>
        )}
        {data.error && (
          <Alert>{data.error}</Alert>
        )}
      </Section>
      <Row name="dialog-footer">
        {data.enabled ? (
          <Button onClick={() => onAction("disable")}>Turn off direct fallback</Button>
        ) : (
          <Button onClick={() => onAction("enable")}>Enable direct fallback</Button>
        )}
      </Row>
    </Page>
  )
}
