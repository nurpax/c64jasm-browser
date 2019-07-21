import React from 'react';
import ReactDOM from 'react-dom';
import cn from 'classnames';

import CloseButton from './CloseButton'
import styles from './Help.module.css';
import * as asmBuiltins from './asmBuiltins';

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
          <a href='https://nurpax.github.io/c64jasm/'>c64jasm</a> is a 6502 assembler written in JavaScript.
          You can run it either on the command line using Node or link it into a web app.
        </p>
        <p>
          <a href='https://nurpax.github.io/c64jasm-browser/'>c64jasm online</a> is an interactive assembler demo site
          where you can write 6502 assembly with live error reporting and disassembly.
        </p>

        <h3>Examples</h3>

        <p>Simple instructions and expressions:</p>
        <AsmBlock text={`
    lda #2+2  ; expression in an immediate field
    sta $d020 ; set border color
        `} />

        <p>Labels:</p>
        <AsmBlock text={`
entry: {
    jsr func

    ldx #8
loop: ; label local to 'entry' scope
    dex
    bpl loop
}

func: {
    ldx #7
loop: ; label local to 'func' scope
    sta buf, x   ; store to buf
    dex
    bpl loop
    rts

buf: !fill 8, 0    ; 8 byte array
}
        `} />

        <p>Declaring and using variables:</p>
        <AsmBlock text={`
!let num_sprites = 4
!let sprite_mask = (1<<num_sprites)-1

    lda #sprite_mask
    sta $d015 ; enable sprites 0-3
        `} />

        <p>Conditional compilation and repetition:</p>
        <AsmBlock text={`
!let num_sprites = 4
    lda #13  ; ptr to sprite data 1 (==address/64)
    ldx #14  ; ptr to sprite data 2

!for i in range(num_sprites) {
    !if (i < 2) {
        sta $07f8+i   ; sprite data 1 from A
    } else {
        stx $07f8+i   ; sprite data 2 from X
    }
}
        `} />

        <p>Define and use macro macro:</p>
        <AsmBlock text={`
!macro set_border(color) {
    lda #color
    sta $d020
}

+set_border(13)  ; expand
        `} />

        <p>A complete C64 program.  To compile a C64 <code>.prg</code> you need
        to insert a BASIC startup sequence at the beginning of your output <code>.prg</code> --
        you can use the <code>c64::basic_entry</code> macro to do this.
        The source code to these macros is shown in a later section.
        </p>

        <AsmBlock text={`
!include "c64.asm"

+c64::basic_start(entry)

entry: {
    lda #0
}
        `} />

        <h3>Built-in support macros</h3>

        <p>The c64jasm online site comes with a small macro library.  You can find their source code below.</p>

        <p>The builtin <code>c64.asm</code> contents:</p>
        <AsmBlock text={asmBuiltins.c64} />

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
