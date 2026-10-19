import { Alert, Button, Checkbox, Field, Heading, Input, Page, Row, Text } from "@/components/ui"

export function ListEditor({ data, onAction }) {
  return (
    <Page>
      <Heading level={2}>{data.heading}</Heading>
      <Field label="List name"><Input name="list-name" value={data.name} placeholder="Family, work or friends" /></Field>
      <Text>Choose chats for this list. This does not change conversation membership.</Text>
      {data.contacts.map((item, i) => (
        <Checkbox key={i} label={item.name} value={item.id} checked={item.selected} />
      ))}
      {data.error && (
        <Alert>{data.error}</Alert>
      )}
      <Row>
        <Button onClick={() => onAction("save")}>Save</Button>
        <Button onClick={() => onAction("cancel")}>Cancel</Button>
      </Row>
      {data.existing && (
        <Row>
          <Button onClick={() => onAction("move-up")}>Move earlier</Button>
          <Button onClick={() => onAction("move-down")}>Move later</Button>
          <Button onClick={() => onAction("delete")}>Delete list</Button>
        </Row>
      )}
    </Page>
  )
}
