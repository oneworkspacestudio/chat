import { Alert, Button, Icon, Input, Page, Row } from "@/components/ui"

export function ChatFilters({ data, onAction }) {
  return (
    <Page>
      <Row name="chat-search">
        <Icon name="search" />
        <Input name="conversation-search" value={data.query} placeholder="Search chats" />
      </Row>
      <Row name="filter-chips">
        <Button name="filter" value="all" onClick={() => onAction("all")}>All</Button>
        <Button name="filter" value="unread" onClick={() => onAction("unread")}>Unread</Button>
        <Button name="filter" value="favourites" onClick={() => onAction("favourites")}>Favourites</Button>
        <Button name="filter" value="groups" onClick={() => onAction("groups")}>Groups</Button>
        {data.lists.map((item, i) => (
          <Button key={i} name="custom-list" value={item.id}>{item.name}</Button>
        ))}
        <Button onClick={() => onAction("new-list")}>New list</Button>
      </Row>
      {data.customList && (
        <Button onClick={() => onAction("edit-list")}>Edit list</Button>
      )}
      {data.selected && (
        <Button onClick={() => onAction("favourite-selected")}>{data.favouriteAction}</Button>
      )}
      {data.error && (
        <Alert>{data.error}</Alert>
      )}
    </Page>
  )
}
