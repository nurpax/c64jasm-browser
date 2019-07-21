
import React from 'react';
import FileSaver from 'file-saver';
import styles from './Disasm.module.css';

function DownloadButton(props: { onClick: (e: React.MouseEvent) => void}) {
  return (
    <div>
      <a
        onClick={props.onClick}
        className={styles.downloadButton}
        href='/' target='_blank'>
          Download .PRG
      </a>
    </div>
  )
}
interface DisasmProps {
  disassembly: string[];
  prg: Buffer;
}

export default class extends React.Component<DisasmProps> {
  handleDownloadPRG = (e: React.MouseEvent) => {
    e.preventDefault();
    const blob = new Blob([this.props.prg]);
    FileSaver.saveAs(blob, "c64jasm-online.prg");
  }


  render () {
    return (
      <div className={styles.layoutContainer}>
        <div className={styles.heading}>
          <div>Disassembly</div>
          <DownloadButton onClick={this.handleDownloadPRG} />
        </div>
        <div className={styles.disasmContainer}>
            <pre>{this.props.disassembly.join('\n')}</pre>
        </div>
      </div>
    )
  }
}
