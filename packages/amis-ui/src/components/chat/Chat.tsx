import React from 'react';
import {ClassNamesFn, themeable, ThemeProps, autobind} from 'amis-core';
import {ChatProps, ChatMessage as ChatMessageType} from './types';
import ChatMessageComponent from './ChatMessage';
import ChatInputComponent from './ChatInput';
import Spinner from '../Spinner';

export interface ChatComponentProps extends ChatProps, ThemeProps {
  classnames: ClassNamesFn;
}

export class Chat extends React.Component<ChatComponentProps> {
  static defaultProps: Partial<ChatComponentProps> = {
    messages: [],
    placeholder: '输入消息...',
    showAvatar: true,
    autoScroll: true,
    showReload: true,
    showCopy: true,
    showSuggestions: true,
    disabled: false,
    loading: false
  };

  messagesContainerRef: React.RefObject<HTMLDivElement>;

  constructor(props: ChatComponentProps) {
    super(props);
    this.messagesContainerRef = React.createRef();
  }

  componentDidMount() {
    this.scrollToBottom();
  }

  componentDidUpdate(prevProps: ChatComponentProps) {
    const {messages} = this.props;
    if (messages !== prevProps.messages) {
      this.scrollToBottom();
    }
  }

  @autobind
  scrollToBottom() {
    const {autoScroll} = this.props;
    if (!autoScroll) return;

    const container = this.messagesContainerRef.current;
    if (container) {
      setTimeout(() => {
        container.scrollTop = container.scrollHeight;
      }, 50);
    }
  }

  @autobind
  handleSend(value: string) {
    const {onSend} = this.props;
    if (onSend) {
      onSend(value, this.props.messages || []);
    }
  }

  @autobind
  handleReload(message: ChatMessageType) {
    const {onReload} = this.props;
    if (onReload) {
      onReload(message, this.props.messages || []);
    }
  }

  @autobind
  handleCopy(content: string) {
    const {onCopy} = this.props;
    if (onCopy) {
      onCopy(content);
    }
  }

  @autobind
  handleSuggestionClick(suggestion: string) {
    const {onSuggestionClick} = this.props;
    if (onSuggestionClick) {
      onSuggestionClick(suggestion);
    } else {
      this.handleSend(suggestion);
    }
  }

  @autobind
  handleLoadMore() {
    const {loadMore} = this.props;
    loadMore && loadMore();
  }

  renderWelcome() {
    const {welcome, classnames: cx} = this.props;

    if (!welcome) {
      return null;
    }

    return (
      <div className={cx('Chat-welcome')}>
        {typeof welcome === 'string' ? <p>{welcome}</p> : welcome}
      </div>
    );
  }

  renderMessages() {
    const {messages} = this.props;
    const {
      showAvatar,
      userAvatar,
      aiAvatar,
      showReload,
      showCopy,
      showSuggestions,
      renderMessage,
      renderSchema,
      renderAvatar,
      loading,
      hasMore,
      classnames: cx
    } = this.props;

    const welcome = this.renderWelcome();
    const msgs = messages || [];

    return (
      <div className={cx('Chat-messages')} ref={this.messagesContainerRef}>
        {hasMore && (
          <div className={cx('Chat-loadMore')} onClick={this.handleLoadMore}>
            {loading ? <Spinner show size="sm" /> : '加载更多'}
          </div>
        )}
        {msgs.length === 0 && welcome}
        {msgs.map(message => (
          <ChatMessageComponent
            key={message.id}
            message={message}
            showAvatar={showAvatar}
            userAvatar={userAvatar}
            aiAvatar={aiAvatar}
            showReload={showReload}
            showCopy={showCopy}
            showSuggestions={showSuggestions}
            onReload={this.handleReload}
            onCopy={this.handleCopy}
            onSuggestionClick={this.handleSuggestionClick}
            renderMessage={renderMessage}
            renderSchema={renderSchema}
            renderAvatar={renderAvatar}
          />
        ))}
      </div>
    );
  }

  renderInput() {
    const {placeholder, disabled} = this.props;

    return (
      <ChatInputComponent
        placeholder={placeholder}
        disabled={disabled}
        onSend={this.handleSend}
      />
    );
  }

  render() {
    const {className, style, height, classnames: cx} = this.props;

    const containerStyle: React.CSSProperties = {
      ...style,
      height: typeof height === 'number' ? `${height}px` : height
    };

    return (
      <div className={cx('Chat', className)} style={containerStyle}>
        {this.renderMessages()}
        {this.renderInput()}
      </div>
    );
  }
}

export default themeable(Chat);
