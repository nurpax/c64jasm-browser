
import React from 'react';
import styles from './Disasm.module.css';

interface DisasmProps {
  disassembly: string[];
}

export default class extends React.PureComponent<DisasmProps> {
  render () {
    return (
      <div className={styles.layoutContainer}>
        <div className='heading'><div className='heading-pad'>Disassembly</div></div>
        <div className={styles.disasmContainer}>
          <pre>{this.props.disassembly.join('\n')}</pre>
        </div>
      </div>
    )
  }
}
