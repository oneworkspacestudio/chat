// Group receipts refer to the original server-authored publication audience.
// Unknown/legacy membership is deliberately only "sent", never "all read".
export function groupDeliveryStatus(message, member, status, constants) {
  if (status < constants.SENT) return status;
  const audience=message.head?.workspace_audience;
  if(audience?.version!==1 || !Array.isArray(audience.members) || !audience.members.length ||
    audience.members.length>10000 || audience.members.some(id=>!/^usr[A-Za-z0-9_-]{11}$/.test(id)) ||
    new Set(audience.members).size!==audience.members.length) return constants.SENT;
  const received=audience.members.map(id=>member(id));
  if(received.every(user=>Number.isInteger(user?.read)&&user.read>=message.seq))return constants.READ;
  // A read acknowledgement also proves delivery; the SDK may omit recv when
  // only the newer read counter was present in its partial subscription update.
  if(received.every(user=>(Number.isInteger(user?.recv)&&user.recv>=message.seq)||
    (Number.isInteger(user?.read)&&user.read>=message.seq)))return constants.RECEIVED;
  return constants.SENT;
}

export function deliveryStatus(topic,message,Tinode) {
  const status=topic.msgStatus(message,false);
  if(!topic.name.startsWith('grp') || status<Tinode.MESSAGE_STATUS_SENT || status>Tinode.MESSAGE_STATUS_READ)return status;
  return groupDeliveryStatus(message,id=>topic.subscriber(id),status,{
    SENT:Tinode.MESSAGE_STATUS_SENT,RECEIVED:Tinode.MESSAGE_STATUS_RECEIVED,READ:Tinode.MESSAGE_STATUS_READ
  });
}

// publishDraft keeps a local no-echo copy. Fetch the exact stored message after
// acknowledgement to obtain its authenticated audience, including on UUID retry.
// Failure leaves a conservative Sent state; it never fabricates delivery.
export function refreshDeliveryAudience(topic,ctrl) {
  if(topic.name.startsWith('grp') && ctrl?.code>=200 && ctrl.code<300 && Number.isInteger(ctrl.params?.seq)){
    topic.getMeta({what:'data',data:{since:ctrl.params.seq,before:ctrl.params.seq+1,limit:1}}).catch(()=>{});
  }
}
