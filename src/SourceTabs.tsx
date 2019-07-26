
import React from 'react';
import styles from './SourceTabs.module.css';
import cn from 'classnames';

import { SourceFile } from './types';

interface SourceTabsProps {
  setSelected: (idx: number) => void;
  selected: number;
  files: SourceFile[];
}

export default class extends React.Component<SourceTabsProps> {
  handleTabClick = (e: React.MouseEvent, idx: number) => {
    this.props.setSelected(idx);
  }
  render () {
    const tabs = this.props.files.map(({name}, idx: number) => {
      return (
        <div
          key={name}
          className={cn(styles.tab, idx === this.props.selected ? styles.active : '')}
          onClick={e => this.handleTabClick(e, idx)}
        >
          {name}
        </div>
      );
    })
    return (
      <div className={styles.container}>
        {tabs}
      </div>
    )
  }
}
