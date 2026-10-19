import { Alert, Button, Heading, Image, Link, Page, Row, Text } from "@/components/ui"

export function WorkspaceApps({ data, onAction }) {
  return (
    <Page>
      <Heading level={2}>Your Workspace apps</Heading>
      {data.loading && (
        <Text>Connecting to Workspace…</Text>
      )}
      {data.error && (
        <>
          <Alert>{data.error}</Alert>
          <Button onClick={() => onAction("retry")}>Retry connection</Button>
        </>
      )}
      {data.apps.map((item, i) => (
        <Link key={i} href={item.url}>
          <Image src={item.icon} alt="" />
          <Text>{item.name}</Text>
        </Link>
      ))}
      {data.home && (
        <Link href={data.home}>Workspace account and settings</Link>
      )}
      <Row>
        <Button onClick={() => onAction("close")}>Close</Button>
        <Button onClick={() => onAction("logout")}>Sign out of Chat</Button>
      </Row>
    </Page>
  )
}
