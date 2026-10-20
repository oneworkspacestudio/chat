// Original small vector sticker pack. No external service, tracking or remote
// image URLs. These exact assets are shared by the picker, peer wire and Drafty.
const drawings={
 wave:['Hello!','<path d="M42 78V42q0-10 8-10t8 10v20-35q0-10 8-10t8 10v34-28q0-10 8-10t8 10v35-16q0-10 8-10t8 10v36q0 32-32 32T42 78Z" fill="#63dec5" stroke="#14266a" stroke-width="4"/>'],
 heart:['With love','<path d="M80 112 32 69C2 33 52 4 80 38 108 4 158 33 128 69Z" fill="#7161ef" stroke="#14266a" stroke-width="5"/>'],
 celebrate:['Celebrate!','<path d="m32 119 20-67 51 48Z" fill="#6addc1" stroke="#14266a" stroke-width="5"/><path d="m64 26 8 16m26-22-5 23m32 1-18 13m25 19-23-3" stroke="#7161ef" stroke-width="8"/><circle cx="46" cy="23" r="6" fill="#f5c94c"/><circle cx="126" cy="109" r="7" fill="#f5c94c"/>'],
 thanks:['Thank you','<path d="m80 14 19 35 40 7-28 29 5 41-36-19-36 19 5-41-28-29 40-7Z" fill="#f5cf60" stroke="#14266a" stroke-width="4"/><path d="M59 69h1m39 0h1M62 83q18 22 36 0" stroke="#14266a" stroke-width="5" stroke-linecap="round" fill="none"/>'],
 yes:['You got this','<circle cx="80" cy="75" r="54" fill="#6addc1" stroke="#14266a" stroke-width="5"/><path d="m49 76 22 21 40-45" stroke="#14266a" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'],
 coffee:['Coffee break','<path d="M39 37h71v45q0 31-35 31T39 82Z" fill="#a79aff" stroke="#14266a" stroke-width="5"/><path d="M112 43q40-4 25 28-8 12-26 9M29 123h96M57 25q-12-11 0-20m24 20Q69 14 81 5" stroke="#14266a" stroke-width="5" fill="none" stroke-linecap="round"/>']
};
export const stickers=Object.entries(drawings).map(([id,[label,body]])=>{
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="144" viewBox="0 0 160 144">${body}</svg>`;
 // Tinode's wire simplifier omits zero-valued at/key (both default to zero).
 // Start with that canonical wire form so recovery compares the exact body.
 const val=btoa(svg);return{id,label,src:'data:image/svg+xml;base64,'+val,content:{txt:' ',fmt:[{len:1}],ent:[{tp:'IM',data:{mime:'image/svg+xml',val,width:160,height:144,name:label+'.svg'}}]}};
});
export const emojiChoices=['😀','😂','🥰','😍','😊','😎','🤔','😭','😮','🥳','👍','👎','👏','🙌','🙏','👋','❤️','💜','🔥','✨','🎉','✅','☕','🌍'];
export function payloadContent(payload){
 if(payload?.kind==='text'&&typeof payload.text==='string'&&payload.text.trim()&&payload.text.length<=4096)return payload.text;
 if(payload?.kind==='sticker'){const item=stickers.find(s=>s.id===payload.id);if(item)return structuredClone(item.content)}
 throw new Error('Direct fallback supports text up to 4,096 characters and bundled stickers.');
}
