
import * as c64jasm from 'c64jasm';

function assemble(text: string) {
  const options = {
    readFileSync: (fname: string) => text
  }
  const res = c64jasm.assemble("foo.asm", options);
  if (res.errors.length === 0) {
    return {
      disassembly: c64jasm.disassemble(res.prg),
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
