
import * as c64jasm from 'c64jasm';

interface AssembleArgs {
  sourceFileMap: { [fname: string]: string };
};

function assemble(args: AssembleArgs) {
  const { sourceFileMap } = args;
  const options = {
    readFileSync: (fname: string) => {
      if (fname in sourceFileMap) {
        return sourceFileMap[fname];
      }
      throw new Error(`File not found ${fname}`);
    }
  }
  const res = c64jasm.assemble("main.asm", options);
  if (res.errors.length === 0) {
    const disasmOptions = {
      isInstruction: res.debugInfo.info().isInstruction
    };
    return {
      prg: res.prg,
      disassembly: c64jasm.disassemble(res.prg, disasmOptions),
      diagnostics: res.errors
    }
  }
  return {
    prg: undefined as Buffer,
    diagnostics: res.errors
  }
}

onmessage = function(e) {
  const send = postMessage as any;
  const res = assemble(e.data);
  send(res);
}
