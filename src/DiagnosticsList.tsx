
import React from 'react'

import { SourceLoc } from 'c64jasm';

import { Diag } from './types'

import styles from './DiagnosticsList.module.css'

interface DiagnosticProps {
  error: { loc: SourceLoc, msg: string };
  index: number;
  selected: boolean;
  onClickItem: (idx: number) => void;
}

class Diagnostic extends React.Component<DiagnosticProps> {
  itemRef = React.createRef<HTMLDivElement>();

  componentDidUpdate (prevProps: DiagnosticProps, prevState: {}, snapshot: DiagnosticProps) {
    if (this.itemRef && this.itemRef.current && this.props.selected) {
      this.itemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      })
    }
  }

  render() {
    const { loc, msg } = this.props.error;
    const selectedClass = this.props.selected ? ` ${styles.selected}` : '';
    return (
      <div
        ref={this.itemRef}
        className={`${styles.diagItem}${selectedClass}`}
        onClick={() => this.props.onClickItem(this.props.index)}
      >
        <span className={`${styles.error}${selectedClass}`}>main.asm:{loc.start.line}:{loc.start.column}: error:</span> {msg}
      </div>
    )
  }
}

interface DiagnosticsListProps {
  diagnostics: Diag[];
  selectedIndex: number | undefined;
  onClickItem: (idx: number) => void;
}

export default class DiagnosticsList extends React.Component<DiagnosticsListProps> {
  handleOnClickItem = (idx: number) => {
    this.props.onClickItem(idx);
  }

  render() {
    const diags = this.props.diagnostics;
    return (
      <div className={styles.diagnostics}>
        {diags.map((d: Diag, idx) => {
          return (
            <Diagnostic
              key={JSON.stringify(d.loc)}
              index={idx}
              error={d} selected={idx==this.props.selectedIndex}
              onClickItem={this.handleOnClickItem}
            />
          )
        })}
      </div>
    )
  }
}