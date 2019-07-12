
import React, { Fragment } from 'react';
import indentTextarea from 'indent-textarea';
import cn from 'classnames';

import { findLine } from './editing';
import { SourceLoc } from 'c64jasm';
import styles from './Editor.module.css';

// TODO get these values from CSS variables
//console.log(getComputedStyle(document.documentElement).getPropertyValue('--code-window-line-height'));
const editorLineHeight = 16;
const numEditorCharRows = 31;
const tabLength = 4;

// RLE compress a list of T's
function groupSame<T>(values: T[]): { count: number, code: T }[] {
  let cur = undefined;
  let out = [];

  for (let v of values) {
      // Start new run
      if (cur !== v) {
          cur = v;
          out.push({code: cur, count: 1});
      } else {
          // Keep growing current group
          out[out.length-1].count++;
      }
  }
  return out;
}

// Count the actual screen char column offset
// based on a character index and the source code
// line contents.
function computeColumn(line: string, charIndex: number) {
  let col = 0;
  for (let i = 0; i < charIndex; i++) {
    if (line.length < i) {
      return undefined;
    }
    if (line[i] === '\t') {
      col += tabLength;
    } else {
      col++;
    }
  }
  return col;
}

// This function can return null if it can't find the diagnostic
// column from the source code.  This can happen if the
// diagnostics are matched on a different version of diagnostics
// vs. source code.  This can happen as the compiler
// runs in a separate thread while text editing happens
// in the main thread without syncing to compiler
// results.
function ErrorSpans(props: {
  text: string,
  errors: SourceLoc[]
}) {
  let lineLength = 0;
  if (!props.text) {
    return null;
  }
  for (let c of props.text) {
    if (c === '\t') {
      lineLength += tabLength;
    } else {
      lineLength++;
    }
  }
  const buf: boolean[] = Array(lineLength).fill(false);

  for (const err of props.errors) {
    const start = computeColumn(props.text, err.start.column - 1);
    if (start === undefined) {
      return null;
    }
    const end = err.start.line === err.end.line ? computeColumn(props.text, err.end.column - 1) : start + 1;
    if (end === undefined) {
      return null;
    }
    for (let x = start; x < end; x++) {
      buf[x] = true;
    }
  }
  const rled = groupSame(buf);
  const spans = [];
  for (let i = 0; i < rled.length; i++) {
    const span = rled[i];
    if (!span.code) {
      spans.push(<pre key={i} style={{display: 'inline-block'}}>{' '.repeat(span.count)}</pre>);
    } else {
      spans.push(<pre key={i} style={{display: 'inline-block'}} className={styles.highlightError}>{' '.repeat(span.count)}</pre>);
    }
  }
  return <Fragment>{spans}</Fragment>;
}

interface HighlighterProps {
  startRow: number;
  numRows: number;
  currentLine: number | undefined;
  textLines: string[];
  lineToErrors: Map<number, SourceLoc[]>;
}

const Highlighter = React.forwardRef((props: HighlighterProps, ref: React.Ref<HTMLDivElement>) => {
  const rows = [];
  // Pad rows is required for smooth scrolling (so that there is overflow-y to scroll)
  const padRows = 2;
  for (let i = props.startRow; i < props.startRow + props.numRows + padRows; i++) {
    const selected = i === props.currentLine && styles.textareaHighlightRowCurrent;
    const errors = props.lineToErrors.get(i);
    if (errors) {
      const text = props.textLines[i];
      rows.push(<div className={cn(styles.textareaHighlightRow, selected)} key={i}><ErrorSpans text={text} errors={errors} /></div>);
    } else {
      rows.push(<div className={cn(styles.textareaHighlightRow, selected)} key={i}></div>);
    }
  }
  return (
    <div ref={ref} className={styles.textareaHighlightOverlay}>
      {rows}
    </div>
  );
})

interface GutterProps {
  startRow: number;
  numRows: number;
  numTextRows: number;
  currentLine: number | undefined;
}

const Gutter = React.forwardRef((props: GutterProps, ref: React.Ref<HTMLDivElement>) => {
  const rows = [];
  const padRows = 2;
  for (let i = props.startRow; i < props.startRow + props.numRows + padRows; i++) {
    const str = `${i+1}`;
    const selected = i === props.currentLine && styles.gutterRowSelected;
    const numStr = (i >= 0 && i < props.numTextRows) ? str.padStart(4, ' ') : '';
    rows.push(<div className={cn(styles.gutterRow, selected)} key={i}>{numStr}</div>);
  }
  return (
    <div ref={ref} className={styles.gutter}>
      {rows}
    </div>
  );
});

interface EditorProps {
  onSourceChanged: (text: string) => void;
  diagnostics: { loc: SourceLoc, msg: string }[];
  errorCharOffset: number | undefined;
}

interface EditorState {
  scrollTop: number;
  currentLine: number | undefined;
  textLines: string[];
}

export default class extends React.Component<EditorProps, EditorState> {
  state = {
    scrollTop: 0,
    currentLine: undefined,
    textLines: []
  }

  textareaRef = React.createRef<HTMLTextAreaElement>();
  gutterRef = React.createRef<HTMLDivElement>();
  highlighterRef = React.createRef<HTMLDivElement>();

  handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const { scrollTop } = e.nativeEvent.target as any;
    this.setState({ scrollTop })
  }

  handleSourceChanged = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    this.props.onSourceChanged(e.target.value);
    this.setState({
      textLines: e.target.value.split('\n')
    })
  }

  updateCursorState = () => {
    if (this.textareaRef && this.textareaRef.current) {
      const r = this.textareaRef.current;
      if (r.selectionStart === r.selectionEnd) {
        const loc = r.selectionStart;
        const line = findLine(this.textareaRef.current.value, loc);
        this.setState({ currentLine: line });
      } else {
        this.setState({ currentLine: undefined });
      }
    }
  }

  // Update cursor position when keys are pressed or selection changes on mouse click
  handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    this.updateCursorState();
  }
  handleKeyDown = (e: React.KeyboardEvent) => {
    this.updateCursorState();
  }
  handleKeyUp = (e: React.KeyboardEvent) => {
    this.updateCursorState();
  }

  componentDidMount () {
    if (this.textareaRef && this.textareaRef.current) {
      indentTextarea.watch(this.textareaRef.current);
      this.textareaRef.current.spellcheck = false;
    }
  }

  componentDidUpdate (prevProps: EditorProps, prevState: EditorState) {
    if (this.textareaRef && this.textareaRef.current) {
      if (this.props.errorCharOffset !== undefined) {
        this.textareaRef.current.focus();
        this.textareaRef.current.setSelectionRange(this.props.errorCharOffset, this.props.errorCharOffset);
      }
    }

    if (prevState.scrollTop !== this.state.scrollTop) {
      const scrollTop = this.state.scrollTop;
      const vscroll = scrollTop % editorLineHeight;
      if (this.gutterRef && this.gutterRef.current) {
        this.gutterRef.current.scrollTop = vscroll;
      }
      if (this.highlighterRef && this.highlighterRef.current) {
        this.highlighterRef.current.scrollTop = vscroll;
      }
    }
  }

  handleMouseDown = (e: React.MouseEvent) => {
    if (this.textareaRef && this.textareaRef.current) {
      const yoffs = e.nativeEvent.offsetY + this.state.scrollTop;
      this.setState({
        currentLine: Math.min(this.state.textLines.length - 1, Math.floor(yoffs / editorLineHeight))
      });
    }
  }

  render () {
    const lineToErrorsMap = new Map<number, SourceLoc[]>();
    this.props.diagnostics.forEach(({loc}) => {
      const line = loc.start.line - 1;
      const lst = lineToErrorsMap.has(line) ? lineToErrorsMap.get(line)! : [];
      lst.push(loc);
      lineToErrorsMap.set(line, lst);
    })
    const startCharRow = Math.floor(this.state.scrollTop / editorLineHeight);
    return (
      <div className={styles.layoutContainer}>
        <div className={styles.heading}>Assembly</div>
        <div className={styles.editorContainer}>
          <Gutter
            ref={this.gutterRef}
            startRow={startCharRow}
            numRows={numEditorCharRows}
            numTextRows={this.state.textLines.length}
            currentLine={this.state.currentLine}
          />
          <div className={styles.textContainer} onMouseDown={this.handleMouseDown}>
            <Highlighter
              ref={this.highlighterRef}
              startRow={startCharRow}
              numRows={numEditorCharRows}
              currentLine={this.state.currentLine}
              textLines={this.state.textLines}
              lineToErrors={lineToErrorsMap}
            />
            <textarea
              wrap='off'
              onKeyUp={this.handleKeyUp}
              onKeyDown={this.handleKeyDown}
              onSelect={this.handleSelect}
              onScroll={this.handleScroll}
              ref={this.textareaRef}
              onChange={this.handleSourceChanged} className={styles.textarea}></textarea>
          </div>
        </div>
      </div>
    )
  }
}
