import React, { useState } from 'react';
import { useApp, GroupParticipantRole, normalizeGroupConversations, saveGroupParticipantRoles } from '../context/AppContext';
import { X, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface NewGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Participant {
  user_id: string;
  role: GroupParticipantRole;
}

const NewGroupModal: React.FC<NewGroupModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { apiCall, userId } = useApp();
  const [name, setName] = useState('');
  const [sourceType, setSourceType] = useState('booking');
  const [sourceId, setSourceId] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([
    { user_id: '', role: 'member' },
  ]);
  const [isCreating, setIsCreating] = useState(false);

  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0,
        v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Please enter a group name');
      return;
    }

    if (!sourceType.trim() || !sourceId.trim()) {
      toast.error('Please fill in source type and ID');
      return;
    }

    const validParticipants = participants.filter((p) => p.user_id.trim());
    if (validParticipants.length === 0) {
      toast.error('Please add at least one participant');
      return;
    }

    setIsCreating(true);
    try {
      const participantRoles = validParticipants.reduce<Record<string, GroupParticipantRole>>(
        (roles, participant) => {
          roles[participant.user_id] = participant.role;
          return roles;
        },
        {}
      );

      const body = {
        conversation_type: 'group',
        topic: name.trim(),
        source_type: sourceType.trim(),
        source_id: sourceId.trim(),
        participant_ids: validParticipants.map((p) => p.user_id),
        participant_roles: participantRoles,
      };

      const created = await apiCall<{ id?: string }>('POST', '/conversations', body);
      if (created?.id) {
        saveGroupParticipantRoles(created.id, participantRoles);
      }
      toast.success('Group created!');
      setName('');
      setSourceType('booking');
      setSourceId('');
      setParticipants([{ user_id: '', role: 'member' }]);
      onSuccess();
    } catch (error) {
      console.error('Failed to create group:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const addParticipant = () => {
    setParticipants([...participants, { user_id: '', role: 'member' }]);
  };

  const removeParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index));
  };

  const updateParticipant = (index: number, field: keyof Participant, value: string) => {
    const updated = [...participants];
    updated[index] = { ...updated[index], [field]: value };
    setParticipants(updated);
  };

  const prefillSource = () => {
    setSourceType('booking');
    setSourceId(generateUUID());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold">New Group Chat</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Group Name */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Group Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Trip Planning"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Source Type */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Source Type *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
                placeholder="e.g., booking"
                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <button
                type="button"
                onClick={prefillSource}
                className="px-3 py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors text-sm font-medium shrink-0"
              >
                Auto-fill
              </button>
            </div>
          </div>

          {/* Source ID */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Source ID *
            </label>
            <input
              type="text"
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              placeholder="UUID or ID"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              required
            />
          </div>

          {/* Participants */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Participants *</label>
              <button
                type="button"
                onClick={addParticipant}
                className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100 transition-colors flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>
            <div className="space-y-2">
              {participants.map((participant, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={participant.user_id}
                    onChange={(e) => updateParticipant(index, 'user_id', e.target.value)}
                    placeholder="user-id"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <select
                    value={participant.role}
                    onChange={(e) =>
                      updateParticipant(
                        index,
                        'role',
                        e.target.value as 'owner' | 'manager' | 'member'
                      )
                    }
                    className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="owner">Owner</option>
                    <option value="manager">Manager</option>
                    <option value="member">Member</option>
                  </select>
                  {participants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeParticipant(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
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
              {isCreating ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewGroupModal;
