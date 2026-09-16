import React from 'react';
import {ClassNamesFn, themeable, ThemeProps, autobind} from 'amis-core';

export interface SuggestionListProps extends ThemeProps {
  suggestions: string[];
  onSelect?: (suggestion: string) => void;
  className?: string;
  classnames: ClassNamesFn;
}

export class SuggestionList extends React.Component<SuggestionListProps> {
  static defaultProps: Partial<SuggestionListProps> = {
    suggestions: []
  };

  @autobind
  handleClick(suggestion: string) {
    const {onSelect} = this.props;
    onSelect && onSelect(suggestion);
  }

  render() {
    const {suggestions, className, classnames: cx} = this.props;

    if (!suggestions || suggestions.length === 0) {
      return null;
    }

    return (
      <div className={cx('Chat-suggestions', className)}>
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            type="button"
            className={cx('Chat-suggestion-btn')}
            onClick={() => this.handleClick(suggestion)}
          >
            {suggestion}
          </button>
        ))}
      </div>
    );
  }
}

export default themeable(SuggestionList);
