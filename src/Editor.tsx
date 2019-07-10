
import React from 'react';
import indentTextarea from 'indent-textarea';
import cn from 'classnames';

import { findLine } from './editing';
import { SourceLoc } from 'c64jasm';
import styles from './Editor.module.css';

// TODO get these values from CSS variables
//console.log(getComputedStyle(document.documentElement).getPropertyValue('--code-window-line-height'));
const editorLineHeight = 16;
const numEditorCharRows = 31;

interface HighlighterProps {
  startRow: number;
  numRows: number;
  currentLine: number | undefined;
}

const Highlighter = React.forwardRef((props: HighlighterProps, ref: React.Ref<HTMLDivElement>) => {
  const rows = [];
  // Pad rows is required for smooth scrolling (so that there is overflow-y to scroll)
  const padRows = 2;
  for (let i = props.startRow; i < props.startRow + props.numRows + padRows; i++) {
    const str = `${i+1}`;
    const selected = i === props.currentLine && styles.textareaHighlightRowCurrent;
    rows.push(<div className={cn(styles.textareaHighlightRow, selected)} key={i}> </div>);
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
  errorLines: Set<number>;
}

const Gutter = React.forwardRef((props: GutterProps, ref: React.Ref<HTMLDivElement>) => {
  const rows = [];
  const padRows = 2;
  for (let i = props.startRow; i < props.startRow + props.numRows + padRows; i++) {
    const str = `${i+1}`;
    const selected = i == props.currentLine && styles.gutterRowSelected;
    const errored = props.errorLines.has(i) && styles.gutterRowErrored;
    const numStr = (i >= 0 && i < props.numTextRows) ? str.padStart(4, ' ') : '';
    rows.push(<div className={cn(styles.gutterRow, selected, errored)} key={i}>{numStr}</div>);
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
}

export default class extends React.Component<EditorProps, EditorState> {
  state = {
    scrollTop: 0,
    currentLine: undefined
  }

  numTextareaLines: number = 0;
  textareaRef = React.createRef<HTMLTextAreaElement>();
  gutterRef = React.createRef<HTMLDivElement>();
  highlighterRef = React.createRef<HTMLDivElement>();

  handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const { scrollTop } = e.nativeEvent.target as any;
    this.setState({ scrollTop })
  }

  handleSourceChanged = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    this.props.onSourceChanged(e.target.value);
    this.numTextareaLines = e.target.value.split('\n').length;
  }

  updateCursorState = () => {
    if (this.textareaRef && this.textareaRef.current) {
      const r = this.textareaRef.current;
      if (r.selectionStart == r.selectionEnd) {
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
        currentLine: Math.min(this.numTextareaLines - 1, Math.floor(yoffs / editorLineHeight))
      });
    }
  }

  render () {
    const errorSet = new Set<number>();
    this.props.diagnostics.forEach(({loc}) => {
      errorSet.add(loc.start.line - 1);
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
            numTextRows={this.numTextareaLines}
            currentLine={this.state.currentLine}
            errorLines={errorSet} />
          <div className={styles.textContainer} onMouseDown={this.handleMouseDown}>
            <Highlighter
              ref={this.highlighterRef}
              startRow={startCharRow}
              numRows={numEditorCharRows}
              currentLine={this.state.currentLine} />
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
