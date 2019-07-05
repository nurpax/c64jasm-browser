
import React from 'react';
import indentTextarea from 'indent-textarea';

import { SourceLoc } from 'c64jasm'
import styles from './Editor.module.css'

const Gutter = React.forwardRef((props: {}, ref: React.Ref<HTMLDivElement>) => {
  const rows = [];
  for (let i = 0; i < 100; i++) {
    const str = `${i+1}`;
    rows.push(<div className={styles.gutterRow} key={i}>{str.padStart(4, ' ')}</div>);
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
}

export default class extends React.Component<EditorProps, EditorState> {
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
          <Gutter ref={this.gutterRef} />
          <textarea
            onScroll={this.handleScroll}
            ref={this.textareaRef}
            onChange={this.handleSourceChanged} className={styles.textarea}></textarea>
        </div>
      </div>
    )
  }

}
