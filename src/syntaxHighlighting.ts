
// Minimal syntax highlighter that supports
// just coloring comments separately from normal code.

export type Color = 'normal' | 'comment';
export type Span = { text: string, color: Color };

export function syntaxHighlightAsm(line: string): Span[] {
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

export function syntaxHighlightJS(line: string): Span[] {
    const res: Span[] = [];
    let match = /^(?<code>.*)(?<comment>\/\/.*)$/.exec(line);
    if (match) {
        const code = (match as any).groups.code;
        const comment = (match as any).groups.comment;
        if (code !== undefined) {
            res.push({ text: code, color: 'normal' });
        }
        if (comment !== undefined) {
            res.push({ text: comment, color: 'comment' });
        }
    } else {
        return [{ text: line, color: 'normal' }];
    }
    return res;
}

export function syntaxHighlight(language: string, line: string): Span[] {
    const syntaxes: {[idx: string]: (line: string) => Span[]} = {
        'asm': syntaxHighlightAsm,
        'inc': syntaxHighlightAsm,
        'js': syntaxHighlightJS
    }
    const hilighter = syntaxes[language];
    if (hilighter !== undefined) {
        return hilighter(line);
    }
    return [{ text: line, color: 'normal' }];
}
