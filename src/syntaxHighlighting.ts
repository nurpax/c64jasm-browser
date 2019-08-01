
// Minimal syntax highlighter that supports
// just coloring comments separately from normal code.

export type Color = 'normal' | 'comment';
export type Span = { text: string, color: Color };

export function syntaxHighlight(line: string): Span[] {
    const res: Span[] = [];
    let match = /^(?<code>[^;]*)(?<comment>;.*)?$/.exec(line);
    if (!match) {
      throw new Error('internal error');
    }
    const code = (match as any).groups.code;
    const comment = (match as any).groups.comment;
    if (code !== undefined) {
        res.push({ text: code, color: 'normal' });
    }
    if (comment !== undefined) {
        res.push({ text: comment, color: 'comment' });
    }
    return res;
}
/*
function test() {
    console.log(syntaxHighlight('lda #0   ; foo'));
    console.log(syntaxHighlight('lda #0'));
    console.log(syntaxHighlight('; baz'));
    console.log(syntaxHighlight(';'));
}
test();
*/