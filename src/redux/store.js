import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import chatSlice from './slices/chatSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    chat: chatSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'persist/PERSIST',
          'chat/sendMessage/pending',
          'chat/sendMessage/fulfilled',
          'chat/sendMessage/rejected',
          'chat/setMessages',
          'chat/addMessage',
          'chat/setChats',
        ],
        ignoredActionsPaths: [
          'payload.timestamp',
          'payload.createdAt',
          'payload.lastMessageTime',
          'payload.lastSeen',
        ],
        ignoredPaths: [
          'chat.messages',
          'chat.chats',
          'auth.user.lastSeen',
        ],
      },
    }),
});

export default store;