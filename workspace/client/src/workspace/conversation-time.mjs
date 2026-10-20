// Conversation time comes from the actual latest message/touched timestamp.
export function conversationTime(value,locale,now=new Date()) {
 if(!value)return null;
 const date=new Date(value);
 if(!Number.isFinite(date.getTime()))return null;
 const day=d=>new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime();
 const yesterday=new Date(now);yesterday.setDate(yesterday.getDate()-1);
 const time=day(date)===day(now)?date.toLocaleTimeString(locale,{timeStyle:'short'}):day(date)===day(yesterday)?new Intl.RelativeTimeFormat(locale,{numeric:'auto'}).format(-1,'day'):date.toLocaleDateString(locale,{dateStyle:'short'});
 return{time,dateTime:date.toISOString(),title:date.toLocaleString(locale)};
}
