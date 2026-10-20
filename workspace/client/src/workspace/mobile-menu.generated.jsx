import { Button, Heading, Page, Row } from "@/components/ui"

export function MobileMenu({ data, onAction }) {
  return (
    <Page>
      <Row name="dialog-header">
        <Heading level={2}>Chat options</Heading>
        <Button name="dialog-close" icon="close" label="Close Chat options" onClick={() => onAction("close")} />
      </Row>
      <Button icon="person" onClick={() => onAction("profile")}>Profile</Button>
      <Button icon="contrast" onClick={() => onAction("appearance")}>Appearance</Button>
      <Button icon="settings" onClick={() => onAction("settings")}>Settings</Button>
      {data.workspace && (
        <Button icon="apps" onClick={() => onAction("workspace")}>Workspace apps</Button>
      )}
      <Button icon="logout" onClick={() => onAction("logout")}>Sign out of Chat</Button>
    </Page>
  )
}
