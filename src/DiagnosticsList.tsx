
import React from 'react'

import { SourceLoc } from 'c64jasm';

import { Diag } from './types'

import styles from './DiagnosticsList.module.css'

class Diagnostic extends React.Component<{ error: { loc: SourceLoc, msg: string } }> {
  render() {
    const { loc, msg } = this.props.error;
    return (
      <div>
        main.asm:{loc.start.line}:{loc.start.column}: error: {msg}
      </div>
    )
  }
}

interface DiagnosticsListProps {
  diagnostics: Diag[];
}

export default class DiagnosticsList extends React.Component<DiagnosticsListProps> {
  render() {
    const diags = this.props.diagnostics;
    return (
      <div className={styles.diagnostics}>
        {diags.map((d: Diag) => <Diagnostic key={JSON.stringify(d.loc)} error={d} />)}
      </div>
    )
  }
}