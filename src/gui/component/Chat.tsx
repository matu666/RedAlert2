import { Component, Fragment } from 'react';
import classNames from 'classnames';
import { ChatRecipientType } from '@/network/chat/ChatMessage';
import { ChatMessageFormat } from '@/gui/chat/ChatMessageFormat';
import { ChatInput } from '@/gui/component/ChatInput';

interface ChatProps {
  messages: any[];
  tooltips?: {
    output?: string;
    input?: string;
    button?: string;
  };
  strings: any;
  chatHistory?: {
    lastComposeTarget: {
      value: {
        type: ChatRecipientType;
        name: string;
      };
    };
  };
  channels?: any[];
  localUsername?: string;
  userColors?: any;
  onSendMessage: (message: string) => void;
  onCancelMessage: () => void;
}

const messageTypeMap = new Map<ChatRecipientType, string>()
  .set(ChatRecipientType.Channel, "type-channel")
  .set(ChatRecipientType.Page, "type-page")
  .set(ChatRecipientType.Whisper, "type-whisper");

export class Chat extends Component<ChatProps> {
  private prevMessageCount = 0;
  private prevOldestMessage: any;
  private prevScrollHeight: number;
  private messageList: HTMLDivElement;
  private textBox: ChatInput;

  render() {
    const { messages, tooltips, strings, chatHistory, channels } = this.props;

    return (
      <div className="chat-wrapper">
        <div 
          className="messages"
          ref={el => this.messageList = el}
          data-r-tooltip={tooltips?.output}
        >
          {messages.map((message, index) => this.renderMessage(message, index))}
        </div>
        <div className="new-message-wrapper">
          <ChatInput
            ref={el => this.textBox = el}
            chatHistory={chatHistory}
            channels={channels}
            className="new-message"
            tooltip={tooltips?.input}
            strings={strings}
            onSubmit={this.props.onSendMessage}
            onCancel={this.props.onCancelMessage}
          />
          <button
            className="icon-button send-message-button"
            data-r-tooltip={tooltips?.button}
            onClick={() => this.textBox.send()}
          />
        </div>
      </div>
    );
  }

  componentDidUpdate(prevProps: ChatProps) {
    if (this.props.messages[0] === this.prevOldestMessage && 
        this.props.messages.length === this.prevMessageCount) {
      return;
    }

    this.prevMessageCount = this.props.messages.length;
    this.prevOldestMessage = this.props.messages[0];

    const scrollHeight = this.messageList.scrollHeight;
    const clientHeight = this.messageList.clientHeight;

    if (scrollHeight !== this.prevScrollHeight && 
        (!this.prevScrollHeight || 
         Math.abs(this.messageList.scrollTop - (this.prevScrollHeight - clientHeight)) <= 1)) {
      this.messageList.scrollTop = scrollHeight - clientHeight;
    }

    this.prevScrollHeight = scrollHeight;
  }

  private renderMessage(message: any, index: number) {
    const formatter = new ChatMessageFormat(
      this.props.strings,
      this.props.localUsername,
      this.props.userColors
    );

    const classes = ["message"];
    let prefix: string | undefined;

    if (message.from !== undefined) {
      prefix = formatter.formatPrefixHtml(message, (name: string) => {
        if (this.props.chatHistory && 
            message.to && 
            message.to.type !== ChatRecipientType.Page) {
          this.props.chatHistory.lastComposeTarget.value = {
            type: ChatRecipientType.Whisper,
            name
          };
        }
      });

      classes.push(messageTypeMap.get(message.to.type));
      if (message.operator) {
        classes.push({ "operator-message": true });
      }
    }

    const isSystemMessage = message.from === undefined;
    const text = formatter.formatTextHtml(message.text, isSystemMessage);

    return (
      <div key={index} className={classNames(classes)}>
        {prefix ? (
          <Fragment>
            <span>{prefix}</span> {text}
          </Fragment>
        ) : text}
      </div>
    );
  }
}