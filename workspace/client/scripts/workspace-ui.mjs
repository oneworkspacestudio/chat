import {readFileSync,writeFileSync} from 'node:fs';
import {parse,compileReact} from '@codedia/parser';
for(const name of ['connection','topic-id','contact-search']) {
const source=readFileSync(`src/workspace/${name}.aui`,'utf8');
let output=compileReact(parse(source));
output=output.replace('{ data, onAction }: { data: any; onAction: (name: string) => void }','{ data, onAction }');
writeFileSync(`src/workspace/${name}.generated.jsx`,output);
console.log(output);
}
