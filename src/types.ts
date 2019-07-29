
import { SourceLoc } from 'c64jasm';

export type Diag = { loc: SourceLoc, msg: string, formatted: string };

export interface SourceFile {
  name: string;
  text: Buffer;
  cursorOffset: number;
};