
import React from 'react';

import styles from './Editor.module.css'

export default class extends React.Component {
  render () {
    return (
      <div className={styles.layoutContainer}>
        <div>Assembly</div>
        <div className={styles.editorContainer}>
          <textarea className={styles.textarea}></textarea>
        </div>
      </div>
    )
  }
}
