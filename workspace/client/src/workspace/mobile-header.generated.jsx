import { Button, Heading, Page, Row } from "@/components/ui"

export function MobileHeader({ data, onAction }) {
  return (
    <Page>
      <Heading level={1}>Chat</Heading>
      <Row>
        {data.workspace && (
          <Button icon="apps" label="Workspace apps" onClick={() => onAction("workspace")} />
        )}
        <Button icon="more_vert" label="More options" onClick={() => onAction("more")} />
      </Row>
    </Page>
  )
}
