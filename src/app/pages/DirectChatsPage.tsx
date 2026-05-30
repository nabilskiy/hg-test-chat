import React, { useEffect, useState, useRef } from 'react';
import { useApp, normalizeConversation } from '../context/AppContext';
import { useNavigate } from 'react-router';
import { Plus, Archive, Copy, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import NewConversationModal from '../components/NewConversationModal';
import { formatDistanceToNow } from 'date-fns';

const DirectChatsPage: React.FC = () => {
  const { apiCall, conversations, setConversations } = useApp();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const intervalRef = useRef<number>();

  const fetchConversations = async (showLoading = false) => {
    try {
      if (showLoading) setIsLoading(true);
      const data = await apiCall('GET', '/conversations');
      const rawConversations = Array.isArray(data) ? data : data.conversations || [];
      setConversations(rawConversations.map(normalizeConversation));
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations(true);

    // Auto-poll every 25 seconds
    intervalRef.current = window.setInterval(() => {
      fetchConversations(false);
    }, 25000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const handlePullRefresh = async () => {
    setIsPulling(true);
    await fetchConversations(false);
    setTimeout(() => setIsPulling(false), 500);
  };

  const copyConversationId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success('Conversation ID copied to clipboard');
  };

  const handleConversationClick = (conversationId: string) => {
    navigate(`/chat/${conversationId}`);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">Direct Chats</h1>
          <button
            onClick={handlePullRefresh}
            disabled={isPulling}
            className="p-1.5 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-gray-600 ${isPulling ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500 mt-2">Loading conversations...</p>
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 mb-2">No conversations yet</p>
            <p className="text-sm text-gray-400">Tap + to start a new chat</p>
          </div>
        ) : (
          <div className="divide-y">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className="p-4 hover:bg-gray-50 cursor-pointer relative group"
              >
                <div onClick={() => handleConversationClick(conv.id)}>
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">
                        {conv.topic || conv.participant_ids.join(', ')}
                      </h3>
                      {conv.archived_at && (
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                          <Archive className="w-3 h-3 inline mr-1" />
                          Archived
                        </span>
                      )}
                    </div>
                    {(conv.unread_count ?? 0) > 0 && (
                      <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 mb-1">
                    Participants: {conv.participant_ids.join(', ')}
                  </div>
                  {conv.last_message && (
                    <div className="flex items-baseline justify-between">
                      <p className="text-sm text-gray-500 truncate flex-1">
                        {conv.last_message.body}
                      </p>
                      <span className="text-xs text-gray-400 ml-2 shrink-0">
                        {formatDistanceToNow(new Date(conv.last_message.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyConversationId(conv.id);
                  }}
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-200 rounded transition-all"
                  title="Copy ID"
                >
                  <Copy className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Conversation Modal */}
      <NewConversationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          fetchConversations(true);
        }}
      />
    </div>
  );
};

export default DirectChatsPage;
