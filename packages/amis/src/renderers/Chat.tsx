import React from 'react';
import {
  Renderer,
  RendererProps,
  buildApi,
  isEffectiveApi,
  createObject,
  autobind,
  resolveVariableAndFilter,
  isPureVariable
} from 'amis-core';
import {Chat, ChatMessage} from 'amis-ui';
import {LazyComponent} from 'amis-core';
import {
  BaseSchema,
  SchemaApi,
  SchemaName,
  SchemaTokenizeableString
} from '../Schema';
import type {AMISSchemaCollection} from 'amis-core';

function loadMarkdown(): Promise<any> {
  return import('amis-ui/lib/components/Markdown').then(item => item.default);
}

export interface AMISAiChatSchema extends BaseSchema {
  type: 'ai-chat';

  name?: SchemaName;

  messages?: Array<ChatMessage>;

  source?: SchemaApi | SchemaTokenizeableString;

  sendApi?: SchemaApi;

  placeholder?: string;

  welcome?: string | AMISSchemaCollection;

  showAvatar?: boolean;

  userAvatar?: string;

  aiAvatar?: string;

  height?: number | string;

  autoScroll?: boolean;

  showReload?: boolean;

  showCopy?: boolean;

  showSuggestions?: boolean;

  enableMarkdown?: boolean;

  stream?: boolean;

  streamSeparator?: string;
}

export interface AiChatProps
  extends RendererProps,
    Omit<AMISAiChatSchema, 'type' | 'className'> {
  messages?: Array<ChatMessage>;
}

export interface AiChatState {
  messages: ChatMessage[];
  loading: boolean;
}

export default class AiChat extends React.Component<AiChatProps, AiChatState> {
  static defaultProps: Partial<AiChatProps> = {
    placeholder: '输入消息...',
    showAvatar: true,
    autoScroll: true,
    showReload: true,
    showCopy: true,
    showSuggestions: true,
    enableMarkdown: true,
    stream: false,
    streamSeparator: '\n',
    height: 500
  };

  markdownComp: React.ComponentType<any> | null = null;

  constructor(props: AiChatProps) {
    super(props);
    this.state = {
      messages: props.messages || this.getInitialMessages(),
      loading: false
    };
  }

  getInitialMessages(): ChatMessage[] {
    return [];
  }

  componentDidMount() {
    if (this.props.enableMarkdown !== false) {
      loadMarkdown().then((comp: any) => {
        this.markdownComp = comp;
        this.forceUpdate();
      });
    }
  }

  componentDidUpdate(prevProps: AiChatProps) {
    const {messages: propMessages} = this.props;
    if (propMessages && propMessages !== prevProps.messages) {
      this.setState({messages: propMessages});
    }
  }

  generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  @autobind
  async handleSend(question: string, currentMessages: ChatMessage[]) {
    const {sendApi, env, data, stream, streamSeparator} = this.props;

    const userMessage: ChatMessage = {
      id: this.generateId(),
      role: 'user',
      content: question,
      status: 'done',
      created: Date.now()
    };

    const assistantMessageId = this.generateId();
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      status: 'pending',
      loading: true,
      created: Date.now()
    };

    const newMessages = [...currentMessages, userMessage, assistantMessage];
    this.setState({
      messages: newMessages,
      loading: true
    });

    if (!isEffectiveApi(sendApi, data)) {
      this.updateMessage(assistantMessageId, {
        content: '请配置 sendApi 接口地址',
        status: 'error',
        loading: false
      });
      this.setState({loading: false});
      return;
    }

    try {
      const ctx = createObject(data, {
        question: question,
        messages: newMessages.slice(0, -1).map(m => ({
          role: m.role,
          content: m.content
        }))
      });

      const api = buildApi(sendApi, ctx);

      if (stream) {
        await this.handleStreamResponse(
          api,
          ctx,
          assistantMessageId,
          streamSeparator || '\n'
        );
      } else {
        const result = await env.fetcher(api, ctx);
        this.handleNormalResponse(result, assistantMessageId);
      }
    } catch (e: any) {
      this.updateMessage(assistantMessageId, {
        content: `请求失败: ${e.message || '未知错误'}`,
        status: 'error',
        loading: false
      });
    } finally {
      this.setState({loading: false});
    }
  }

  async handleStreamResponse(
    api: any,
    ctx: any,
    messageId: string,
    separator: string
  ) {
    const {env} = this.props;
    const fetchOptions = {
      method: api.method || 'POST',
      headers: api.headers || {
        'Content-Type': 'application/json'
      },
      body: api.data ? JSON.stringify(api.data) : undefined
    };

    try {
      const response = await fetch(api.url, fetchOptions);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Stream not supported');
      }

      const decoder = new TextDecoder();
      let content = '';
      let buffer = '';

      this.updateMessage(messageId, {
        status: 'streaming',
        loading: false
      });

      while (true) {
        const {done, value} = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, {stream: true});
        buffer += chunk;

        let sepIndex;
        while ((sepIndex = buffer.indexOf(separator)) !== -1) {
          const line = buffer.substring(0, sepIndex).trim();
          buffer = buffer.substring(sepIndex + separator.length);

          if (line.startsWith('data: ')) {
            const dataStr = line.substring(6);
            if (dataStr === '[DONE]') {
              break;
            }
            try {
              const data = JSON.parse(dataStr);
              const delta =
                data.choices?.[0]?.delta?.content ||
                data.choices?.[0]?.text ||
                data.content ||
                data.delta ||
                data;
              if (typeof delta === 'string') {
                content += delta;
                this.updateMessageContent(messageId, content);
              }
            } catch {
              if (dataStr) {
                content += dataStr;
                this.updateMessageContent(messageId, content);
              }
            }
          } else if (line) {
            content += line;
            this.updateMessageContent(messageId, content);
          }
        }
      }

      if (buffer.trim()) {
        content += buffer;
        this.updateMessageContent(messageId, content);
      }

      this.updateMessage(messageId, {
        content,
        status: 'done',
        loading: false
      });
    } catch (e: any) {
      console.error('Stream error:', e);
      throw e;
    }
  }

  handleNormalResponse(result: any, messageId: string) {
    let answer = '';
    let suggestions: string[] | undefined;
    let schema: any = undefined;

    if (result && result.data) {
      const data = result.data;
      answer =
        data.answer ||
        data.content ||
        data.message ||
        data.text ||
        (typeof data === 'string' ? data : '');
      suggestions = data.suggestions;
      schema = data.schema;
    } else if (typeof result === 'string') {
      answer = result;
    }

    this.updateMessage(messageId, {
      content: answer || '未获取到回复',
      status: answer ? 'done' : 'error',
      loading: false,
      suggestions,
      schema
    });
  }

  updateMessage(id: string, updates: Partial<ChatMessage>) {
    this.setState(prev => ({
      messages: prev.messages.map(msg =>
        msg.id === id ? {...msg, ...updates} : msg
      )
    }));
  }

  updateMessageContent(id: string, content: string) {
    this.setState(prev => ({
      messages: prev.messages.map(msg =>
        msg.id === id ? {...msg, content} : msg
      )
    }));
  }

  @autobind
  handleReload(message: ChatMessage) {
    const {messages} = this.state;

    const msgIndex = messages.findIndex(m => m.id === message.id);
    if (msgIndex <= 0) return;

    const userMessage = messages[msgIndex - 1];
    if (userMessage.role !== 'user') return;

    const previousMessages = messages.slice(0, msgIndex - 1);
    this.handleSend(userMessage.content, previousMessages);
  }

  @autobind
  handleCopy(content: string) {
    const {env} = this.props;
    if (env.copy) {
      env.copy(content);
    } else {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = content;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch (e) {}
    }
    if (env.notify) {
      env.notify('success', '已复制到剪贴板');
    }
  }

  @autobind
  handleSuggestionClick(suggestion: string) {
    this.handleSend(suggestion, this.state.messages);
  }

  @autobind
  renderSchema(schemaConfig: any, message: ChatMessage) {
    const {render} = this.props;
    if (!render || !schemaConfig) return null;
    return render(`chat-message-${message.id}`, schemaConfig, {
      key: message.id
    });
  }

  @autobind
  renderMessageContent(message: ChatMessage, props: any) {
    const {classnames: cx, enableMarkdown} = this.props;
    const {classnames: cx2} = props;
    const finalCx = cx || cx2;

    if (message.schema) {
      return (
        <div className={finalCx('Chat-message-schema')}>
          {this.renderSchema(message.schema, message)}
        </div>
      );
    }

    if (enableMarkdown !== false && this.markdownComp && message.content) {
      const MarkdownComp = this.markdownComp;
      return (
        <div className={finalCx('Chat-message-markdown')}>
          <MarkdownComp value={message.content} />
        </div>
      );
    }

    return (
      <div className={finalCx('Chat-message-text')}>{message.content}</div>
    );
  }

  render() {
    const {
      className,
      style,
      placeholder,
      welcome,
      showAvatar,
      userAvatar,
      aiAvatar,
      height,
      autoScroll,
      showReload,
      showCopy,
      showSuggestions,
      classnames: cx
    } = this.props;

    const {messages, loading} = this.state;

    return (
      <Chat
        className={className}
        style={style}
        messages={messages}
        placeholder={placeholder}
        welcome={welcome}
        showAvatar={showAvatar}
        userAvatar={userAvatar}
        aiAvatar={aiAvatar}
        height={height}
        autoScroll={autoScroll}
        showReload={showReload}
        showCopy={showCopy}
        showSuggestions={showSuggestions}
        disabled={loading}
        loading={loading}
        onSend={this.handleSend}
        onReload={this.handleReload}
        onCopy={this.handleCopy}
        onSuggestionClick={this.handleSuggestionClick}
        renderMessage={this.renderMessageContent}
        renderSchema={this.renderSchema}
      />
    );
  }
}

@Renderer({
  type: 'ai-chat'
})
export class AiChatRenderer extends AiChat {}
