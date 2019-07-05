
import React from 'react';
import indentTextarea from 'indent-textarea';
import cn from 'classnames';

import { findLine } from './editing';
import { SourceLoc } from 'c64jasm';
import styles from './Editor.module.css';

interface GutterProps {
  currentLine: number;
}

const Gutter = React.forwardRef((props: GutterProps, ref: React.Ref<HTMLDivElement>) => {
  const rows = [];
  for (let i = 0; i < 100; i++) {
    const str = `${i+1}`;
    const selected = i == props.currentLine && styles.gutterRowSelected;
    rows.push(<div className={cn(styles.gutterRow, selected)} key={i}>{str.padStart(4, ' ')}</div>);
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
  cursorLoc: {
    offset: number,
    line: number
  }
}

export default class extends React.Component<EditorProps, EditorState> {
  state = {
    scrollTop: 0,
    cursorLoc: {
      offset: 0,
      line: 0
    }
  }
  textareaRef = React.createRef<HTMLTextAreaElement>();
  gutterRef = React.createRef<HTMLDivElement>();

  handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const { scrollTop } = e.nativeEvent.target as any;
    if (this.gutterRef && this.gutterRef.current) {
      this.gutterRef.current.scrollTop = scrollTop;
    }
    this.setState({ scrollTop })
  }

  handleSourceChanged = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    this.props.onSourceChanged(e.target.value);
  }

  updateCursorState = () => {
    if (this.textareaRef && this.textareaRef.current) {
      const loc = this.textareaRef.current.selectionStart;
      const line = findLine(this.textareaRef.current.value, loc);
      this.setState({
        cursorLoc: {
          offset: loc,
          line: line !== undefined ? line : 0
        }
      })
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

  componentDidUpdate () {
    if (this.textareaRef && this.textareaRef.current) {
      if (this.props.errorCharOffset !== undefined) {
        this.textareaRef.current.focus();
        this.textareaRef.current.setSelectionRange(this.props.errorCharOffset, this.props.errorCharOffset);
      }
    }
  }

  render () {
    return (
      <div className={styles.layoutContainer}>
        <div className={styles.heading}>Assembly</div>
        <div className={styles.editorContainer}>
          <Gutter ref={this.gutterRef} currentLine={this.state.cursorLoc.line} />
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
    )
  }

}
