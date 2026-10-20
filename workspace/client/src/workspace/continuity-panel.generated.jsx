import { Alert, Button, Image, Page, Row, Section, Text } from "@/components/ui"

export function ContinuityPanel({ data, onAction }) {
  return (
    <Page>
      <Row name="continuity-status">
        <Text>{data.status}</Text>
        <Button onClick={() => onAction("details")}>Direct fallback</Button>
      </Row>
      {data.error && (
        <Alert>{data.error}</Alert>
      )}
      {data.hasRows && (
        <Section name="direct-messages">
          {data.rows.map((item, i) => (
            <Section key={i} name="direct-message">
              <Text>{item.caption}</Text>
              {item.image ? (
                <Image src={item.image} alt={item.alt} />
              ) : (
                <Text>{item.text}</Text>
              )}
              <Text>{item.status}</Text>
            </Section>
          ))}
        </Section>
      )}
    </Page>
  )
}
