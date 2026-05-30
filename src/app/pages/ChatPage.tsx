import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useApp, Message, mergeMessages, parseMessagesResponse } from '../context/AppContext';
import { ArrowLeft, Send, Archive, ArrowDown, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

const ChatPage: React.FC = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { apiCall, conversations, userId } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageBody, setMessageBody] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const pollSinceRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<number>();

  const conversation = conversations.find((c) => c.id === conversationId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async (showLoading = false, since?: string) => {
    if (!conversationId) return;

    try {
      if (showLoading) setIsLoading(true);
      const endpoint = since
        ? `/messages/${conversationId}?limit=50&since=${encodeURIComponent(since)}`
        : `/messages/${conversationId}?limit=50`;

      const data = await apiCall('GET', endpoint);
      const page = parseMessagesResponse(data);
      const msgs = page.messages;

      if (since) {
        setMessages((prev) => mergeMessages(prev, msgs));
      } else {
        setMessages(msgs);
      }

      const nextSince =
        page.next_since ?? (msgs.length > 0 ? msgs[msgs.length - 1].created_at : pollSinceRef.current);
      if (nextSince) {
        pollSinceRef.current = nextSince;
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async () => {
    if (!conversationId) return;
    try {
      await apiCall('POST', `/conversations/${conversationId}/read`, {});
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  useEffect(() => {
    if (!conversationId) return;

    pollSinceRef.current = null;
    fetchMessages(true);
    markAsRead();

    intervalRef.current = window.setInterval(() => {
      if (pollSinceRef.current) {
        fetchMessages(false, pollSinceRef.current);
      }
    }, 12000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      setShowScrollButton(scrollHeight - scrollTop - clientHeight > 200);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageBody.trim() || !conversationId) return;

    setIsSending(true);
    try {
      const body = {
        conversation_id: conversationId,
        body: messageBody.trim(),
        event_type: 'new_message',
        attachments: [],
      };

      await apiCall('POST', '/messages/send', body);
      setMessageBody('');
      await fetchMessages(false);
      scrollToBottom();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleArchive = async () => {
    if (!conversationId) return;
    
    const confirmed = window.confirm('Are you sure you want to archive this conversation?');
    if (!confirmed) return;

    try {
      await apiCall('POST', `/conversations/${conversationId}/archive`, {});
      toast.success('Conversation archived');
      navigate('/direct');
    } catch (error) {
      console.error('Failed to archive conversation:', error);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white shrink-0">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={() => navigate('/direct')}
            className="p-1 hover:bg-gray-100 rounded transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="font-bold truncate">
              {conversation?.topic || conversation?.participant_ids?.join(', ') || 'Chat'}
            </h1>
            {conversation && (
              <p className="text-xs text-gray-500 truncate">
                {conversation.participant_ids?.join(', ') ?? ''}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={handleArchive}
          className="p-2 hover:bg-gray-100 rounded transition-colors shrink-0"
          title="Archive"
        >
          <Archive className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>No messages yet. Send the first one!</p>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => {
              const isOwnMessage = msg.sender_id === userId;
              const showSender = index === 0 || messages[index - 1].sender_id !== msg.sender_id;

              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[75%] ${isOwnMessage ? 'items-end' : 'items-start'} flex flex-col`}>
                    {showSender && (
                      <span className="text-xs text-gray-500 mb-1 px-1">
                        {msg.sender_id}
                      </span>
                    )}
                    <div
                      className={`rounded-lg px-3 py-2 ${
                        isOwnMessage
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-900'
                      }`}
                    >
                      <p className="text-sm break-words">{msg.body}</p>
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {msg.attachments.map((att, idx) => (
                            <a
                              key={idx}
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center gap-1 text-xs underline ${
                                isOwnMessage ? 'text-blue-100' : 'text-blue-600'
                              }`}
                            >
                              <Paperclip className="w-3 h-3" />
                              {att.name || 'Attachment'}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 mt-1 px-1">
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-24 right-4 bg-blue-600 text-white rounded-full p-2 shadow-lg hover:bg-blue-700 transition-colors"
        >
          <ArrowDown className="w-5 h-5" />
        </button>
      )}

      {/* Message Input */}
      <form
        onSubmit={handleSendMessage}
        className="p-4 border-t bg-white shrink-0"
      >
        <div className="flex gap-2">
          <textarea
            value={messageBody}
            onChange={(e) => setMessageBody(e.target.value)}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
          />
          <button
            type="submit"
            disabled={isSending || !messageBody.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatPage;
