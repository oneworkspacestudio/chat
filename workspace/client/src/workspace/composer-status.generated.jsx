import { Alert, Page, Text } from "@/components/ui"

export function ComposerStatus({ data, onAction }) {
  return (
    <Page>
      {data.sending && (
        <Text>Sending… Your draft is kept until the server confirms.</Text>
      )}
      {data.error && (
        <Alert>{data.error}</Alert>
      )}
    </Page>
  )
}
