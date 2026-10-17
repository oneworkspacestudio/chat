import {readFileSync,writeFileSync} from 'node:fs';
import {parse,compileReact} from '@codedia/parser';
const source=readFileSync('src/workspace/connection.aui','utf8');
let output=compileReact(parse(source));
output=output.replace('{ data, onAction }: { data: any; onAction: (name: string) => void }','{ data, onAction }');
writeFileSync('src/workspace/connection.generated.jsx',output);
console.log(output);
