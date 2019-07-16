import React from 'react';

import styles from './CloseButton.module.css';

export default function CloseButton(props: { onClose: () => void}) {
  return (
    <div className={styles.buttonContainer}>
      <a title='Close Help' href='/' target='_blank' className={styles.close} onClick={e => {
          e.preventDefault();
          props.onClose();
        }}>
      </a>
    </div>
  );
}

