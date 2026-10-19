import { Button, Link, Page, Text } from "@/components/ui"

export function AccountConnection({ data, onAction }) {
  return (
    <Page>
      {data.name && (
        <Text>{data.name}</Text>
      )}
      <Text>MyAccounts manages your name, password and account security.</Text>
      <Link href={data.accountsURL}>Open MyAccounts</Link>
      {data.actions && (
        <>
          <Button onClick={() => onAction("blocked")}>Blocked contacts</Button>
          <Button onClick={() => onAction("logout")}>Sign out of Chat</Button>
        </>
      )}
    </Page>
  )
}
