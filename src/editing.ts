
import { SourceLoc } from 'c64jasm';

export function findCharOffset(source: string, loc: SourceLoc) {
  const lines = source.split('\n');
  let offset = 0;
  for (let i = 0; i < loc.start.line - 1; i++) {
    offset += lines[i].length + 1;
  }
  return offset + loc.start.column - 1;
}

export function findLine(source: string, charOffset: number) {
  const lines = source.split('\n');
  let offset = 0;
  for (let i = 0; i < lines.length; i++) {
    offset += lines[i].length + 1;
    if (charOffset < offset) {
        return i;
    }
  }
  return undefined;
}
