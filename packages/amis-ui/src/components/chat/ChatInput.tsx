import React from 'react';
import {ClassNamesFn, themeable, ThemeProps, autobind} from 'amis-core';
import Button from '../Button';
import {Icon} from '../icons';

export interface ChatInputProps extends ThemeProps {
  placeholder?: string;
  disabled?: boolean;
  onSend?: (value: string) => void;
  className?: string;
  classnames: ClassNamesFn;
  sendIcon?: string;
}

export interface ChatInputState {
  value: string;
}

export class ChatInput extends React.Component<ChatInputProps, ChatInputState> {
  static defaultProps: Partial<ChatInputProps> = {
    placeholder: '输入消息...',
    disabled: false,
    sendIcon: 'enter'
  };

  state: ChatInputState = {
    value: ''
  };

  textareaRef: React.RefObject<HTMLTextAreaElement>;

  constructor(props: ChatInputProps) {
    super(props);
    this.textareaRef = React.createRef();
  }

  @autobind
  handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    this.setState({value: e.target.value});
    this.adjustTextareaHeight();
  }

  @autobind
  adjustTextareaHeight() {
    const textarea = this.textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }

  @autobind
  handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const {disabled} = this.props;
    const {value} = this.state;

    if (e.key === 'Enter' && !e.shiftKey && !disabled) {
      e.preventDefault();
      this.handleSend();
    }
  }

  @autobind
  handleSend() {
    const {onSend, disabled} = this.props;
    const {value} = this.state;
    const trimmedValue = value.trim();

    if (trimmedValue && !disabled && onSend) {
      onSend(trimmedValue);
      this.setState({value: ''}, () => {
        this.adjustTextareaHeight();
      });
    }
  }

  @autobind
  focus() {
    if (this.textareaRef.current) {
      this.textareaRef.current.focus();
    }
  }

  render() {
    const {
      placeholder,
      disabled,
      className,
      classnames: cx,
      sendIcon
    } = this.props;
    const {value} = this.state;

    return (
      <div className={cx('Chat-input', className)}>
        <div className={cx('Chat-input-wrapper', {'is-disabled': disabled})}>
          <textarea
            ref={this.textareaRef}
            className={cx('Chat-input-textarea')}
            value={value}
            placeholder={placeholder}
            onChange={this.handleChange}
            onKeyDown={this.handleKeyDown}
            disabled={disabled}
            rows={1}
          />
          <Button
            className={cx('Chat-input-send-btn')}
            level="primary"
            type="button"
            disabled={disabled || !value.trim()}
            onClick={this.handleSend}
          >
            <Icon icon={sendIcon} className="icon" />
          </Button>
        </div>
      </div>
    );
  }
}

export default themeable(ChatInput);
