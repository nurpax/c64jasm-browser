
import React from 'react';
import styles from './SourceTabs.module.css';
import cn from 'classnames';

import memoizeOne from 'memoize-one';

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

class LoadGist extends React.PureComponent<LoadGistProps, LoadGistState> {
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
              if (gistId !== '') {
                this.props.onLoadGist(gistId);
              }
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

interface TabsProps {
  filenames: string[];
  sortIdx: number[];
  selected: number;
  setSelected: (idx: number) => void;
}

class Tabs extends React.PureComponent<TabsProps> {
  handleTabClick = (e: React.MouseEvent, idx: number) => {
    this.props.setSelected(idx);
  }

  render () {
    const tabs = this.props.sortIdx.map((idx: number) => {
      const name = this.props.filenames[idx];
      return (
        <div
          key={name}
          className={cn(styles.tab, idx === this.props.selected ? styles.active : '')}
          onClick={e => this.handleTabClick(e, idx)}
        >
          {name}
        </div>
      );
    });
    return (
      <div className={styles.tabContainer}>
        {tabs}
      </div>
    );
  }
}

function stringArrayEqual(newArgs: string[][], oldArgs: string[][]) {
  if (newArgs === oldArgs) {
    return true;
  }
  if (newArgs.length !== oldArgs.length) {
    return false;
  }
  const a = newArgs[0];
  const b = oldArgs[0];
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
        return false;
    }
  }
  return true;
}

function getFileExt(fname: string) {
  return fname.slice((fname.lastIndexOf(".") - 1 >>> 0) + 2);
}

function computeSortOrder(files: string[]): number[] {
  const arr: [string, number][] = [];
  for (let i = 0; i < files.length; i++) {
    arr.push([files[i], i]);
  }
  arr.sort(([fnA, idxA], [fnB, idxB]) => {
    const extA = getFileExt(fnA);
    const extB = getFileExt(fnB);
    if (extA == extB) {
      return fnA.localeCompare(fnB);
    }
    return extA.localeCompare(extB);
  });
  return arr.map(([_, i]) => i);
}

interface SourceTabsProps {
  setSelected: (idx: number) => void;
  selected: number;
  files: SourceFile[];

  loadingGist: boolean;
  onLoadGist: (gistId: string) => void;
}

export default class extends React.Component<SourceTabsProps> {

  // Return the same filename ptr if the source file names didn't change.
  // Just to avoid some rerenders.
  getFilenames = memoizeOne((files: string[]) => files, stringArrayEqual);
  getSortOrder = memoizeOne((files: string[]) => computeSortOrder(files));

  render () {
    const filenames = this.getFilenames(this.props.files.map(({name}) => name));
    const sortIdx = this.getSortOrder(filenames);
    return (
      <div className={styles.container}>
        <Tabs
          filenames={filenames}
          sortIdx={sortIdx}
          selected={this.props.selected}
          setSelected={this.props.setSelected}
        />
        <LoadGist
          onLoadGist={this.props.onLoadGist}
          loadingGist={this.props.loadingGist}
        />
      </div>
    )
  }
}
