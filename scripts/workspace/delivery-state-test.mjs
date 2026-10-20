import assert from 'node:assert/strict';
import {groupDeliveryStatus,refreshDeliveryAudience} from '../../workspace/client/src/workspace/delivery-state.mjs';
const constants={SENT:4,RECEIVED:5,READ:6},alice='usrAAAAAAAAAAA',bob='usrBBBBBBBBBBB';
const message={seq:9,head:{workspace_audience:{version:1,members:[alice,bob]}}};
const states={[alice]:{read:9,recv:9},[bob]:{read:8,recv:8}},lookup=id=>states[id];
assert.equal(groupDeliveryStatus(message,lookup,6,constants),4,'one reader is not everyone');
states[bob].recv=9;assert.equal(groupDeliveryStatus(message,lookup,6,constants),5);
delete states[alice].recv;assert.equal(groupDeliveryStatus(message,lookup,6,constants),5,'read also proves delivery when recv is omitted');
states[bob].read=9;assert.equal(groupDeliveryStatus(message,lookup,6,constants),6);
delete states[bob];assert.equal(groupDeliveryStatus(message,lookup,6,constants),4,'removal must not shrink the historical audience');
assert.equal(groupDeliveryStatus({seq:9,head:{}},lookup,6,constants),4,'legacy unknown audience');
assert.equal(groupDeliveryStatus(message,lookup,2,constants),2,'pending status retained');
for(const audience of [{version:2,members:[alice]},{version:1,members:[]},{version:1,members:[alice,alice]},{version:1,members:['bad']}]){
 assert.equal(groupDeliveryStatus({seq:9,head:{workspace_audience:audience}},lookup,6,constants),4);
}
console.log('PASS Group delivery requires all original recipients; unknown, removed, malformed and pending states remain truthful');
let query;refreshDeliveryAudience({name:'grpSynthetic',getMeta:value=>{query=value;return Promise.resolve()}},{code:202,params:{seq:9}});
assert.deepEqual(query,{what:'data',data:{since:9,before:10,limit:1}},'stored audience must use a real Tinode data query');
console.log('PASS Acknowledgement fetch explicitly requests the exact stored data message');
