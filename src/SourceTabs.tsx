
import React from 'react';
import styles from './SourceTabs.module.css';
import cn from 'classnames';

import { SourceFile } from './types';

interface LoadGistInputProps {
  onCancel: () => void;
  onSubmit: (gistId: string) => void;
}

class LoadGistInput extends React.Component<LoadGistInputProps, { gistIdOrUrl: string }> {

  state = {
    gistIdOrUrl: ''
  }

  handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Either grab ID from a URL like:
    //
    // https://gist.github.com/nurpax/58a3a6105946bb64346fad7428ec86b4
    //
    // or if the user just provided the ID directly, use that.
    const parts = this.state.gistIdOrUrl.split('/');
    if (parts.length > 0) {
      this.props.onSubmit(parts[parts.length-1]);
    }
  }

  handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ gistIdOrUrl: e.target.value });
  }

  handlePreventBlur = (e: React.MouseEvent) => {
    e.preventDefault();
  }

  render () {
    return (
      <form
        onSubmit={this.handleSubmit}
        onBlur={() => this.props.onCancel()}
        className={styles.gistInputContainer}>
        <input
          placeholder='Gist ID or URL'
          onChange={this.handleInputChange}
          value={this.state.gistIdOrUrl}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === 'Escape') {
              this.props.onCancel();
            }
          }}
          autoFocus
          spellCheck={false}
          type='text'
        />
        <button onMouseDown={this.handlePreventBlur} type='submit'>Go!</button>
      </form>
    )
  }
}

interface LoadGistProps {
  loadingGist: boolean;
  onLoadGist: (gistId: string) => void;
}

interface LoadGistState {
  editing: boolean;
}

class LoadGist extends React.Component<LoadGistProps, LoadGistState> {
  state = {
    editing: false
  }

  handleOpenLoadInput = () => {
    this.setState(prevState => {
      return { editing: !prevState.editing };
    });
  }
  render () {
    if (this.props.loadingGist) {
      return (
        <div className={styles.gistContainer}>
          <div className={styles.loadingText}>
            Loading gist..
          </div>
        </div>
      );
    }
    return (
      <div className={styles.gistContainer}>
        {this.state.editing &&
          <LoadGistInput
            onCancel={() => this.setState({ editing: false })}
            onSubmit={(gistId) => {
              this.setState({ editing: false });
              this.props.onLoadGist(gistId);
            }}
          />
        }
        {!this.state.editing &&
          <div className={styles.gistLoadButtonContainer}>
            <button
              onClick={this.handleOpenLoadInput}
              title='Load source files from a GitHub public Gist'
            >
              Load Gist
            </button>
          </div>
        }
      </div>
    );
  }
}

interface SourceTabsProps {
  setSelected: (idx: number) => void;
  selected: number;
  files: SourceFile[];

  loadingGist: boolean;
  onLoadGist: (gistId: string) => void;
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
        <div className={styles.tabContainer}>
          {tabs}
        </div>
        <LoadGist
          onLoadGist={this.props.onLoadGist}
          loadingGist={this.props.loadingGist}
        />
      </div>
    )
  }
}
