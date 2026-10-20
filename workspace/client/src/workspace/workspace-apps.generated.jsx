import { Alert, Button, Heading, Image, Link, Page, Row, Section, Text } from "@/components/ui"

export function WorkspaceApps({ data, onAction }) {
  return (
    <Page>
      <Row name="dialog-header">
        <Heading level={2}>Workspace apps</Heading>
        <Button name="dialog-close" icon="close" label="Close Workspace apps" onClick={() => onAction("close")} />
      </Row>
      <Section name="app-list">
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
      </Section>
      <Row name="dialog-footer">
        {data.home && (
          <Link href={data.home}>Workspace settings</Link>
        )}
        <Button onClick={() => onAction("logout")}>Sign out of Chat</Button>
      </Row>
    </Page>
  )
}
