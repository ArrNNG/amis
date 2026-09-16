export type ChatRole = 'user' | 'assistant' | 'system';

export type ChatMessageStatus = 'pending' | 'streaming' | 'done' | 'error';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  schema?: any;
  suggestions?: string[];
  status?: ChatMessageStatus;
  created?: number;
  avatar?: string;
  loading?: boolean;
}

export interface ChatProps {
  messages?: ChatMessage[];
  placeholder?: string;
  welcome?: string | React.ReactNode;
  showAvatar?: boolean;
  userAvatar?: string;
  aiAvatar?: string;
  className?: string;
  style?: React.CSSProperties;
  height?: number | string;
  autoScroll?: boolean;
  showReload?: boolean;
  showCopy?: boolean;
  showSuggestions?: boolean;
  disabled?: boolean;
  onSend?: (question: string, messages: ChatMessage[]) => void;
  onReload?: (message: ChatMessage, messages: ChatMessage[]) => void;
  onCopy?: (content: string) => void;
  onSuggestionClick?: (suggestion: string) => void;
  renderMessage?: (message: ChatMessage, props: any) => React.ReactNode;
  renderSchema?: (schema: any, message: ChatMessage) => React.ReactNode;
  renderAvatar?: (message: ChatMessage) => React.ReactNode;
  loadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
}
