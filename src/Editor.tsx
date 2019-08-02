
import React, { Fragment } from 'react';
import indentTextarea from 'indent-textarea';
import cn from 'classnames';
import ResizeObserver from 'resize-observer-polyfill';
import { SourceLoc } from 'c64jasm';

import { findLine } from './editing';
import { Color, syntaxHighlight } from './syntaxHighlighting';
import styles from './Editor.module.css';

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
    <div ref={ref} className={cn(styles.overlayCommon, styles.textareaHighlightOverlay)}>
      {rows}
    </div>
  );
})

interface SyntaxHighlighterProps {
  startRow: number;
  numRows: number;
  textLines: string[];

  // Fixed dims is required so that the div size adjusts to a
  // smaller width/height when the <textarea> (that this
  // syntax highlighter mirrors) has borders, the syntax
  // highlighter div won't render on top of the scrollbars.
  fixedDims: { width: number, height: number };

  // Scroll left is basically the same as writing to ref.scrollLeft
  // except that we pull this off by a styling change, setting
  // a negative left margin on the div.  The highlighter
  // div needs to be wrapped in another div so that the left side
  // of the syntax highlighted text will be clipped.
  scrollLeft: number;
}

const SyntaxHighlighter = React.forwardRef((props: SyntaxHighlighterProps, ref: React.Ref<HTMLDivElement>) => {
  const rows = [];
  // Pad rows is required for smooth scrolling (so that there is overflow-y to scroll)
  const padRows = 2;
  type HighlightEntry = {
    [K in Color]: string;
  }
  const hilightStyles: HighlightEntry = {
    'normal': styles.hiliteNormal,
    'comment': styles.hiliteComment,
  };
  for (let i = props.startRow; i < props.startRow + props.numRows + padRows; i++) {
    const spanElts = [];
    if (i < props.textLines.length) {
      const line = props.textLines[i];
      const spans = syntaxHighlight(line);
      for (let j = 0; j < spans.length; j++) {
        const { text, color } = spans[j];
        spanElts.push(<pre key={j} className={hilightStyles[color]} style={{display: 'inline-block'}}>{text}</pre>);
      }
    }
    rows.push(<div className={styles.textareaSyntaxHighlightRow} key={i}>{spanElts}</div>);
  }
  return (
    <div
      ref={ref}
      className={cn(styles.overlayCommon, styles.textareaSyntaxHighlightOverlay)}
      style={{
        width: `${props.fixedDims.width}px`,
        height: `${props.fixedDims.height}px`
      }}
    >
      <div style={{marginLeft: `-${props.scrollLeft}px`}}>
        {rows}
      </div>
    </div>
  );
})

interface GutterProps {
  startRow: number;
  numRows: number;
  numTextRows: number;
  currentLine: number | undefined;
  height: number;
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
    <div
      ref={ref}
      className={styles.gutter}
      style={{height: `${props.height}px`}}
    >
      {rows}
    </div>
  );
});

interface EditorProps {
  defaultValue: string;
  defaultCursorOffset: number;
  onSourceChanged: (text: string) => void;
  onSourcePositionChanged: (cursorOffset: number) => void;
  diagnostics: { loc: SourceLoc, msg: string }[];
  errorCharOffset: number | undefined;
}

interface EditorState {
  scrollTop: number;
  scrollLeft: number;
  currentLine: number | undefined;
  textLines: string[];
  textareaDims: { width: number, height: number };
}

export default class extends React.Component<EditorProps, EditorState> {

  private editorLineHeight = 0;
  private resizeObserver: ResizeObserver;

  constructor (props: EditorProps) {
    super(props);

    this.state = {
      scrollTop: 0,
      scrollLeft: 0,
      currentLine: 0,
      textLines: this.props.defaultValue.split('\n'),
      textareaDims: { width: 0, height: 0 }
    }

    const cssVarLineHeight = getComputedStyle(document.documentElement).getPropertyValue('--code-window-line-height');
    let match = /^[ ]*(?<height>[0-9]+)px$/.exec(cssVarLineHeight);
    if (!match) {
      throw new Error('failed querying css var --code-window-line-height' + cssVarLineHeight);
    }
    this.editorLineHeight = parseInt((match as any).groups.height);

    this.resizeObserver = new ResizeObserver(entries => {
      const e = entries[0]
      this.setState({
        textareaDims: {
          width: e.contentRect.width,
          height: e.contentRect.height
        }
      });
    });
  }

  textareaRef = React.createRef<HTMLTextAreaElement>();
  gutterRef = React.createRef<HTMLDivElement>();
  highlighterRef = React.createRef<HTMLDivElement>();
  syntaxHighlighterRef = React.createRef<HTMLDivElement>();

  handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const { scrollTop, scrollLeft } = e.nativeEvent.target as any;
    this.setState({ scrollTop, scrollLeft });
  }

  handleSourceChanged = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    this.props.onSourceChanged(e.target.value);
    this.setState({
      textLines: e.target.value.split('\n')
    });
  }

  updateCursorState = () => {
    if (this.textareaRef.current) {
      const r = this.textareaRef.current;
      if (r.selectionStart === r.selectionEnd) {
        const loc = r.selectionStart;
        const line = findLine(this.textareaRef.current.value, loc);
        this.setState({ currentLine: line });
      } else {
        this.setState({ currentLine: undefined });
      }
      this.props.onSourcePositionChanged(r.selectionStart);
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
    if (this.textareaRef.current) {
      indentTextarea.watch(this.textareaRef.current);
      this.textareaRef.current.spellcheck = false;
      this.textareaRef.current.selectionStart = this.props.defaultCursorOffset;
      this.textareaRef.current.selectionEnd = this.props.defaultCursorOffset;
      this.textareaRef.current.focus();

      this.resizeObserver.observe(this.textareaRef.current);
    }
  }

  componentWillUnmount () {
    if (this.textareaRef.current) {
      this.resizeObserver.unobserve(this.textareaRef.current);
    }
  }


  componentDidUpdate (prevProps: EditorProps, prevState: EditorState) {
    if (this.textareaRef.current) {
      if (this.props.errorCharOffset !== undefined) {
        this.textareaRef.current.focus();
        this.textareaRef.current.setSelectionRange(this.props.errorCharOffset, this.props.errorCharOffset);
      }
    }

    if (prevState.scrollTop !== this.state.scrollTop) {
      const scrollTop = this.state.scrollTop;
      const vscroll = scrollTop % this.editorLineHeight;
      if (this.gutterRef.current) {
        this.gutterRef.current.scrollTop = vscroll;
      }
      if (this.highlighterRef.current) {
        this.highlighterRef.current.scrollTop = vscroll;
      }
      if (this.syntaxHighlighterRef.current) {
        this.syntaxHighlighterRef.current.scrollTop = vscroll;
      }
    }
  }

  handleMouseDown = (e: React.MouseEvent) => {
    if (this.textareaRef.current) {
      const yoffs = e.nativeEvent.offsetY + this.state.scrollTop;
      this.setState({
        currentLine: Math.min(this.state.textLines.length - 1, Math.floor(yoffs / this.editorLineHeight))
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
    });
    const startCharRow = Math.floor(this.state.scrollTop / this.editorLineHeight);
    const numEditorCharRows =
      this.state.textareaDims.height !== 0 ? Math.ceil(this.state.textareaDims.height / this.editorLineHeight) : 1;
    return (
      <div className={styles.layoutContainer}>
        <div className='heading'><div className='heading-pad'>Assembly</div></div>
        <div className={styles.editorContainer}>
          <Gutter
            ref={this.gutterRef}
            startRow={startCharRow}
            numRows={numEditorCharRows}
            numTextRows={this.state.textLines.length}
            currentLine={this.state.currentLine}
            height={this.state.textareaDims.height}
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
              className={cn(styles.overlayCommon, styles.textarea)}
              defaultValue={this.props.defaultValue}
              wrap='off'
              onKeyUp={this.handleKeyUp}
              onKeyDown={this.handleKeyDown}
              onSelect={this.handleSelect}
              onScroll={this.handleScroll}
              ref={this.textareaRef}
              onChange={this.handleSourceChanged}
            />
            <SyntaxHighlighter
              ref={this.syntaxHighlighterRef}
              startRow={startCharRow}
              fixedDims={this.state.textareaDims}
              scrollLeft={this.state.scrollLeft}
              numRows={numEditorCharRows}
              textLines={this.state.textLines}
            />
          </div>
        </div>
      </div>
    )
  }
}
