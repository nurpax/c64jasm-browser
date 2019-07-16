import React from 'react';
import ReactDOM from 'react-dom';
import cn from 'classnames';

import CloseButton from './CloseButton'
import styles from './Help.module.css';

const modalRoot = document.getElementById('modal-root')!;

interface ModalProps {
  children: JSX.Element;
}

class Modal extends React.Component {
  private el: HTMLDivElement;

  constructor(props: ModalProps) {
    super(props);
    this.el = document.createElement('div');
  }

  componentDidMount() {
    // The portal element is inserted in the DOM tree after
    // the Modal's children are mounted, meaning that children
    // will be mounted on a detached DOM node. If a child
    // component requires to be attached to the DOM tree
    // immediately when mounted, for example to measure a
    // DOM node, or uses 'autoFocus' in a descendant, add
    // state to Modal and only render the children when Modal
    // is inserted in the DOM tree.
    modalRoot.appendChild(this.el);
  }

  componentWillUnmount() {
    modalRoot.removeChild(this.el);
  }

  render() {
    return ReactDOM.createPortal(
      this.props.children,
      this.el,
    );
  }
}

function Emph(props: { children: JSX.Element | string}) {
  return <span className={styles.emph}>{props.children}</span>;
}

// Remove leading and trailing line feeds from a string.
// This is to prevent unnecessary line feeds in
// assembly code written in string literals.
function trimLineFeeds(str: string): string {
  const lines = str.split('\n');
  let s;
  for (s = 0; s < lines.length; s++) {
    const line = lines[s].trim();
    if (line.length !== 0) {
      break;
    }
  }
  let e;
  for (e = lines.length - 1; e >= 0; e--) {
    const line = lines[e].trim();
    if (line.length !== 0) {
      break;
    }
  }
  return lines.slice(s, e + 1).join('\n');
}

function AsmBlock(props: { text: string }) {
  return (
    <pre className={styles.asm}>{trimLineFeeds(props.text)}</pre>
  )
}
class HelpContents extends React.Component<{onClose: () => void}> {
  render () {
    return (
      <div className={cn(styles.helpContents, styles.maxWidth)}>
        <div className={styles.headingContainer}>
          <div className={styles.closeButtonContainer}>
            <CloseButton onClose={this.props.onClose} />
          </div>
          <h1>c64jasm online </h1>
        </div>
        <p>
          <Emph>c64jasm</Emph> is an experimental 6502 assembler written in JavaScript.  It can
          run both in the browser and on the command line (using Node).
        </p>
        <p>
          <Emph>c64jasm online</Emph> is an interactive assembler demo site
          where you can write 6502 assembly with live error reporting and disassembly.
        </p>

        <p>
          Example code:
        </p>

        <AsmBlock text={`
    lda #13
    sta $d020
        `} />

      </div>
    )
  }
}

interface HelpProps {
  visible: boolean;
  onClose: () => void;
}

class HelpModal extends React.Component<HelpProps> {
  render () {
    const { visible } = this.props;
    return (
      <Modal>
        <div className={cn(visible ? styles.helpModalContainer : styles.hidden)}>
          <div className={styles.circleReveal}>
            <HelpContents onClose={this.props.onClose}/>
          </div>
        </div>
      </Modal>
    )
  }
}

export default HelpModal;
