import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X } from 'lucide-react';
import { toast } from 'sonner';

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const NewConversationModal: React.FC<NewConversationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { apiCall } = useApp();
  const [participantId, setParticipantId] = useState('');
  const [topic, setTopic] = useState('');
  const [message, setMessage] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!participantId.trim()) {
      toast.error('Please enter a participant ID');
      return;
    }

    setIsCreating(true);
    try {
      const body: any = {
        conversation_type: 'direct',
        participant_ids: [participantId.trim()],
      };

      if (topic.trim()) {
        body.topic = topic.trim();
      }

      if (message.trim()) {
        body.message = {
          body: message.trim(),
          event_type: 'new_message',
          attachments: [],
        };
      }

      await apiCall('POST', '/conversations', body);
      toast.success('Conversation created!');
      setParticipantId('');
      setTopic('');
      setMessage('');
      onSuccess();
    } catch (error) {
      console.error('Failed to create conversation:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const quickFill = (userId: string) => {
    setParticipantId(userId);
    setTopic(`Chat with ${userId}`);
    setMessage(`Hey ${userId}!`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-bold">New Direct Chat</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Quick Fill Buttons */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Quick Test With:
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => quickFill('user-2')}
                className="flex-1 px-3 py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors text-sm font-medium"
              >
                user-2
              </button>
              <button
                type="button"
                onClick={() => quickFill('user-3')}
                className="flex-1 px-3 py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors text-sm font-medium"
              >
                user-3
              </button>
            </div>
          </div>

          {/* Participant ID */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Participant ID *
            </label>
            <input
              type="text"
              value={participantId}
              onChange={(e) => setParticipantId(e.target.value)}
              placeholder="e.g., user-2"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Topic */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Topic (optional)
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Project Discussion"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* First Message */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              First Message (optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Say hello..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? 'Creating...' : 'Create Chat'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewConversationModal;
