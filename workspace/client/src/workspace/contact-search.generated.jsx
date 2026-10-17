import { Button, Input, Page, Row } from "@/components/ui"

export function ContactSearch({ data, onAction }) {
  return (
    <Page>
      <Row>
        <Input name="query" value={data.query} placeholder={data.placeholder} />
        <Button variant="primary" onClick={() => onAction("search")}>Search</Button>
        {data.query && (
          <Button onClick={() => onAction("clear")}>Clear</Button>
        )}
      </Row>
    </Page>
  )
}
