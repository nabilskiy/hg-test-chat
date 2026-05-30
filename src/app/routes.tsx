import { createBrowserRouter } from 'react-router';
import Root from './components/Root';
import DirectChatsPage from './pages/DirectChatsPage';
import GroupChatsPage from './pages/GroupChatsPage';
import SettingsPage from './pages/SettingsPage';
import ChatPage from './pages/ChatPage';
import GroupChatPage from './pages/GroupChatPage';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Root,
    children: [
      { index: true, Component: DirectChatsPage },
      { path: 'direct', Component: DirectChatsPage },
      { path: 'groups', Component: GroupChatsPage },
      { path: 'settings', Component: SettingsPage },
      { path: 'chat/:conversationId', Component: ChatPage },
      { path: 'group-chat/:conversationId', Component: GroupChatPage },
    ],
  },
]);
