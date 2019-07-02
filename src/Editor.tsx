
import React from 'react';

import styles from './Editor.module.css'

interface EditorProps {
  onSourceChanged: (text: string) => void;
}

export default class extends React.Component<EditorProps> {
  handleSourceChanged = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    this.props.onSourceChanged(e.target.value);
  }

  render () {
    return (
      <div className={styles.layoutContainer}>
        <div className={styles.heading}>Assembly</div>
        <div className={styles.editorContainer}>
          <textarea onChange={this.handleSourceChanged} className={styles.textarea}></textarea>
        </div>
      </div>
    )
  }
}
