import React from 'react';
import {ClassNamesFn, themeable, ThemeProps, autobind} from 'amis-core';
import {ChatMessage as ChatMessageType} from './types';
import Avatar from '../Avatar';
import {Icon} from '../icons';
import SuggestionList from './SuggestionList';

export interface ChatMessageProps extends ThemeProps {
  message: ChatMessageType;
  showAvatar?: boolean;
  userAvatar?: string;
  aiAvatar?: string;
  showReload?: boolean;
  showCopy?: boolean;
  showSuggestions?: boolean;
  onReload?: (message: ChatMessageType) => void;
  onCopy?: (content: string) => void;
  onSuggestionClick?: (suggestion: string) => void;
  renderMessage?: (message: ChatMessageType, props: any) => React.ReactNode;
  renderSchema?: (schema: any, message: ChatMessageType) => React.ReactNode;
  renderAvatar?: (message: ChatMessageType) => React.ReactNode;
  className?: string;
  classnames: ClassNamesFn;
}

export class ChatMessage extends React.Component<ChatMessageProps> {
  static defaultProps: Partial<ChatMessageProps> = {
    showAvatar: true,
    showReload: true,
    showCopy: true
  };

  @autobind
  handleCopy() {
    const {message, onCopy} = this.props;
    if (onCopy) {
      onCopy(message.content);
    } else {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = message.content;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch (e) {}
    }
  }

  @autobind
  handleReload() {
    const {message, onReload} = this.props;
    onReload && onReload(message);
  }

  @autobind
  handleSuggestionClick(suggestion: string) {
    const {onSuggestionClick} = this.props;
    onSuggestionClick && onSuggestionClick(suggestion);
  }

  renderAvatar() {
    const {
      message,
      showAvatar,
      userAvatar,
      aiAvatar,
      renderAvatar,
      classnames: cx
    } = this.props;

    if (!showAvatar || message.role === 'system') {
      return null;
    }

    if (renderAvatar) {
      return renderAvatar(message);
    }

    let avatarSrc = message.avatar;
    let avatarText = '';

    if (!avatarSrc) {
      if (message.role === 'user') {
        avatarSrc = userAvatar;
        avatarText = 'U';
      } else if (message.role === 'assistant') {
        avatarSrc = aiAvatar;
        avatarText = 'AI';
      }
    }

    return (
      <div className={cx('Chat-message-avatar')}>
        <Avatar src={avatarSrc} text={avatarText} />
      </div>
    );
  }

  renderContent() {
    const {message, renderMessage, renderSchema, classnames: cx} = this.props;

    if (renderMessage) {
      return renderMessage(message, this.props);
    }

    if (message.loading || message.status === 'pending') {
      return (
        <div className={cx('Chat-message-loading')}>
          <span className={cx('Chat-message-loading-dot')} />
          <span className={cx('Chat-message-loading-dot')} />
          <span className={cx('Chat-message-loading-dot')} />
        </div>
      );
    }

    if (message.schema && renderSchema) {
      return renderSchema(message.schema, message);
    }

    const isStreaming = message.status === 'streaming';

    return (
      <div className={cx('Chat-message-content')}>
        {message.content}
        {isStreaming && <span className={cx('Chat-message-cursor')}>|</span>}
      </div>
    );
  }

  renderActions() {
    const {message, showReload, showCopy, classnames: cx} = this.props;

    if (
      message.role === 'system' ||
      message.loading ||
      message.status === 'pending' ||
      message.status === 'streaming'
    ) {
      return null;
    }

    const actions: React.ReactNode[] = [];

    if (showCopy && message.content) {
      actions.push(
        <button
          key="copy"
          type="button"
          className={cx('Chat-message-action-btn')}
          onClick={this.handleCopy}
          title="复制"
        >
          <Icon icon="copy" className="icon" />
        </button>
      );
    }

    if (showReload && message.role === 'assistant') {
      actions.push(
        <button
          key="reload"
          type="button"
          className={cx('Chat-message-action-btn')}
          onClick={this.handleReload}
          title="重新生成"
        >
          <Icon icon="reload" className="icon" />
        </button>
      );
    }

    if (actions.length === 0) {
      return null;
    }

    return <div className={cx('Chat-message-actions')}>{actions}</div>;
  }

  renderSuggestions() {
    const {message, showSuggestions} = this.props;

    if (!message.suggestions || message.suggestions.length === 0) {
      return null;
    }

    return (
      <SuggestionList
        suggestions={message.suggestions}
        onSelect={this.handleSuggestionClick}
      />
    );
  }

  render() {
    const {message, className, classnames: cx} = this.props;

    return (
      <div
        className={cx(
          'Chat-message',
          `is-${message.role}`,
          {
            'is-loading': message.loading || message.status === 'pending',
            'is-streaming': message.status === 'streaming',
            'is-error': message.status === 'error'
          },
          className
        )}
      >
        {this.renderAvatar()}
        <div className={cx('Chat-message-body')}>
          <div className={cx('Chat-message-bubble')}>
            {this.renderContent()}
          </div>
          {this.renderActions()}
          {this.renderSuggestions()}
        </div>
      </div>
    );
  }
}

export default themeable(ChatMessage);
