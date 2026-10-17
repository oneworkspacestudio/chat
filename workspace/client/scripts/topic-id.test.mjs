import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// Load the pure ESM helper without changing the upstream CommonJS build config.
const source=readFileSync(new URL('../src/workspace/topic-id.js',import.meta.url),'utf8');
const {normalizeTopicID}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
test('accepts native IDs, whitespace, and QR URI',()=>{
 for(const id of ['usrAbcdefgh_-1','grpAbcdefgh_-1','chnAbcdefgh_-1']) {
  assert.equal(normalizeTopicID(' '+id+' '),id);
  assert.equal(normalizeTopicID('tinode:///id/'+id),id);
 }
});
test('rejects malformed IDs and external links',()=>{
 for(const id of ['',null,'usr','usrAbcdefgh_-12','usrAbc!efgh_-1','https://example.test/usrAbcdefgh_-1','javascript:alert(1)','tinode:///id/usrAbcdefgh_-1?extra=1']) assert.equal(normalizeTopicID(id),null);
});
