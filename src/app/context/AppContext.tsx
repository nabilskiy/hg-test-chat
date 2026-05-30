import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

export type AuthMode = 'none' | 'local_jwt' | 'custom_bearer';

export interface ApiLog {
  id: string;
  timestamp: Date;
  method: string;
  url: string;
  status: number;
  responseTime: number;
  requestBody?: any;
  responseBody?: any;
}

export interface Conversation {
  id: string;
  conversation_type: string;
  participant_ids: string[];
  topic?: string;
  last_message?: {
    body: string;
    created_at: string;
  };
  unread_count?: number;
  archived_at?: string | null;
  created_at: string;
}

export interface GroupConversation {
  id: string;
  name: string;
  source_type: string;
  source_id: string;
  participants: Array<{
    user_id: string;
    role: GroupParticipantRole;
  }>;
  last_message?: {
    body: string;
    created_at: string;
  };
  unread_count?: number;
  archived_at?: string | null;
  created_at: string;
}

export type GroupParticipantRole = 'owner' | 'manager' | 'member';
export type GroupParticipantRolesMap = Record<string, GroupParticipantRole>;

const GROUP_ROLES_STORAGE_KEY = 'messager-group-participant-roles';

function isGroupParticipantRole(value: string): value is GroupParticipantRole {
  return value === 'owner' || value === 'manager' || value === 'member';
}

function buildParticipantsFromMembers(
  members: string[],
  roleMap?: Record<string, string>
): GroupConversation['participants'] {
  return members.map((userId) => {
    const role = roleMap?.[userId];
    return {
      user_id: userId,
      role: role && isGroupParticipantRole(role) ? role : 'member',
    };
  });
}

export function loadAllGroupParticipantRoles(): Record<string, GroupParticipantRolesMap> {
  try {
    const raw = localStorage.getItem(GROUP_ROLES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveGroupParticipantRoles(
  groupId: string,
  roles: GroupParticipantRolesMap
): void {
  try {
    const all = loadAllGroupParticipantRoles();
    all[groupId] = roles;
    localStorage.setItem(GROUP_ROLES_STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Ignore storage errors in the testing app.
  }
}

export function applyGroupParticipantRoles(
  group: GroupConversation,
  roleMap?: GroupParticipantRolesMap
): GroupConversation {
  if (!roleMap) {
    return group;
  }

  return {
    ...group,
    participants: group.participants.map((participant) => ({
      ...participant,
      role: roleMap[participant.user_id] ?? participant.role,
    })),
  };
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  event_type: string;
  attachments?: Array<{ url: string; type: string; name?: string }>;
  created_at: string;
}

export interface MessagesPage {
  messages: Message[];
  next_since?: string | null;
  next_before?: string | null;
  has_more?: boolean;
}

export function parseMessagesResponse(data: unknown): MessagesPage {
  if (Array.isArray(data)) {
    const messages = data as Message[];
    return {
      messages,
      next_since: messages.at(-1)?.created_at ?? null,
    };
  }

  const page = data as MessagesPage;
  return {
    messages: page.messages ?? [],
    next_since: page.next_since,
    next_before: page.next_before,
    has_more: page.has_more,
  };
}

export function mergeMessages(existing: Message[], incoming: Message[]): Message[] {
  if (incoming.length === 0) {
    return existing;
  }

  const seen = new Set(existing.map((message) => message.id));
  const merged = [...existing];

  for (const message of incoming) {
    if (!seen.has(message.id)) {
      seen.add(message.id);
      merged.push(message);
    }
  }

  return merged;
}

function normalizeLastMessage(
  raw: Record<string, unknown>
): Conversation['last_message'] {
  if (typeof raw.last_message === 'string') {
    return {
      body: raw.last_message,
      created_at:
        (raw.last_message_at as string | undefined) ??
        (raw.created_at as string | undefined) ??
        new Date().toISOString(),
    };
  }

  if (raw.last_message && typeof raw.last_message === 'object') {
    const message = raw.last_message as { body?: string; created_at?: string };
    return {
      body: message.body ?? '',
      created_at:
        message.created_at ??
        (raw.last_message_at as string | undefined) ??
        (raw.created_at as string | undefined) ??
        new Date().toISOString(),
    };
  }

  return undefined;
}

export function normalizeConversation(raw: Record<string, unknown>): Conversation {
  const participantIds =
    (raw.participant_ids as string[] | undefined) ??
    (raw.members as string[] | undefined) ??
    [];
  const createdAt =
    (raw.created_at as string | undefined) ??
    (raw.last_message_at as string | undefined) ??
    new Date().toISOString();

  return {
    id: raw.id as string,
    conversation_type: (raw.conversation_type as string | undefined) ?? 'direct',
    participant_ids: participantIds,
    topic: raw.topic as string | undefined,
    last_message: normalizeLastMessage(raw),
    unread_count: raw.unread_count as number | undefined,
    archived_at:
      (raw.archived_at as string | null | undefined) ??
      (raw.is_archived ? createdAt : null),
    created_at: createdAt,
  };
}

export function normalizeGroupConversation(raw: Record<string, unknown>): GroupConversation {
  const members =
    (raw.members as string[] | undefined) ??
    (raw.participant_ids as string[] | undefined) ??
    [];
  const roleMap =
    (raw.participant_roles as Record<string, string> | undefined) ??
    (raw.roles as Record<string, string> | undefined);
  const participants =
    (raw.participants as GroupConversation['participants'] | undefined) ??
    buildParticipantsFromMembers(members, roleMap);
  const createdAt =
    (raw.created_at as string | undefined) ??
    (raw.last_message_at as string | undefined) ??
    new Date().toISOString();

  return {
    id: raw.id as string,
    name: (raw.name as string | undefined) ?? (raw.topic as string | undefined) ?? 'Group chat',
    source_type: (raw.source_type as string | undefined) ?? '',
    source_id: (raw.source_id as string | undefined) ?? '',
    participants,
    last_message: normalizeLastMessage(raw),
    unread_count: raw.unread_count as number | undefined,
    archived_at:
      (raw.archived_at as string | null | undefined) ??
      (raw.is_archived ? createdAt : null),
    created_at: createdAt,
  };
}

export function normalizeGroupConversations(rawItems: unknown[]): GroupConversation[] {
  const cachedRoles = loadAllGroupParticipantRoles();

  return rawItems.map((item) => {
    const group = normalizeGroupConversation(item as Record<string, unknown>);
    return applyGroupParticipantRoles(group, cachedRoles[group.id]);
  });
}

interface AppContextType {
  baseUrl: string;
  setBaseUrl: (url: string) => void;
  authMode: AuthMode;
  setAuthMode: (mode: AuthMode) => void;
  userId: string;
  setUserId: (id: string) => void;
  token: string;
  setToken: (token: string) => void;
  apiLogs: ApiLog[];
  clearApiLogs: () => void;
  apiCall: <T = any>(method: string, endpoint: string, body?: any) => Promise<T>;
  conversations: Conversation[];
  setConversations: (convs: Conversation[]) => void;
  groupConversations: GroupConversation[];
  setGroupConversations: (convs: GroupConversation[]) => void;
}

const REMOTE_API_BASE = 'https://mctest.d4ua.com/messager';
const DEFAULT_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? '/messager' : REMOTE_API_BASE);

/** Route cross-origin API calls through the Vite dev proxy to avoid browser CORS blocks. */
function resolveDevProxyUrl(url: string): string {
  if (!import.meta.env.DEV) {
    return url;
  }

  if (url.startsWith('/')) {
    return url;
  }

  try {
    const parsed = new URL(url);
    const sameOrigin =
      typeof window !== 'undefined' && parsed.origin === window.location.origin;

    if (sameOrigin) {
      return url;
    }

    if (parsed.hostname === 'mctest.d4ua.com' && parsed.pathname.startsWith('/messager')) {
      return `${parsed.pathname}${parsed.search}`;
    }

    if (
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') &&
      parsed.port === '8102'
    ) {
      return `/local-messager${parsed.pathname}${parsed.search}`;
    }
  } catch {
    // Keep the original URL if parsing fails.
  }

  return url;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL);
  const [authMode, setAuthMode] = useState<AuthMode>('none');
  const [userId, setUserId] = useState('user-1');
  const [token, setToken] = useState('');
  const [apiLogs, setApiLogs] = useState<ApiLog[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [groupConversations, setGroupConversations] = useState<GroupConversation[]>([]);

  const clearApiLogs = useCallback(() => {
    setApiLogs([]);
  }, []);

  const apiCall = useCallback(
    async <T = any,>(method: string, endpoint: string, body?: any): Promise<T> => {
      const startTime = Date.now();
      const logId = `${Date.now()}-${Math.random()}`;

      let url = resolveDevProxyUrl(`${baseUrl}${endpoint}`);

      // Add user_id query param for 'none' auth mode
      if (authMode === 'none') {
        const separator = url.includes('?') ? '&' : '?';
        url += `${separator}user_id=${encodeURIComponent(userId)}`;
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add Authorization header for JWT/Bearer modes
      if ((authMode === 'local_jwt' || authMode === 'custom_bearer') && token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const options: RequestInit = {
        method,
        headers,
      };

      if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        options.body = JSON.stringify(body);
      }

      try {
        const response = await fetch(url, options);
        const responseTime = Date.now() - startTime;
        
        let responseBody;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          responseBody = await response.json();
        } else {
          responseBody = await response.text();
        }

        const log: ApiLog = {
          id: logId,
          timestamp: new Date(),
          method,
          url,
          status: response.status,
          responseTime,
          requestBody: body,
          responseBody,
        };

        setApiLogs((prev) => [log, ...prev].slice(0, 20));

        if (!response.ok) {
          const errorMsg = typeof responseBody === 'object' 
            ? responseBody.message || responseBody.error || 'API Error'
            : responseBody || 'API Error';
          toast.error(`${response.status}: ${errorMsg}`);
          throw new Error(errorMsg);
        }

        return responseBody as T;
      } catch (error: any) {
        const responseTime = Date.now() - startTime;
        const log: ApiLog = {
          id: logId,
          timestamp: new Date(),
          method,
          url,
          status: 0,
          responseTime,
          requestBody: body,
          responseBody: { error: error.message },
        };
        setApiLogs((prev) => [log, ...prev].slice(0, 20));
        
        if (error.message !== 'API Error') {
          toast.error(`Network error: ${error.message}`);
        }
        throw error;
      }
    },
    [baseUrl, authMode, userId, token]
  );

  const value: AppContextType = {
    baseUrl,
    setBaseUrl,
    authMode,
    setAuthMode,
    userId,
    setUserId,
    token,
    setToken,
    apiLogs,
    clearApiLogs,
    apiCall,
    conversations,
    setConversations,
    groupConversations,
    setGroupConversations,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
