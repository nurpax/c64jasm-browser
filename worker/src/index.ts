
import { assembleWithOptions, disassemble } from 'c64jasm';

function assemble(text: string) {
  const options = {
    readFileSync: (fname: string) => text
  }
  const res = assembleWithOptions("foo.asm", options);
  if (res.errors.length === 0) {
    return {
      disassembly: disassemble(res.prg),
      diagnostics: res.errors
    }
  }
  return {
    diagnostics: res.errors
  }
}

onmessage = function(e) {
  const send = postMessage as any;
  const res = assemble(e.data.source);
  send(res);
}
