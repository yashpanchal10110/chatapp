import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import firestore from '@react-native-firebase/firestore';

// ✅ SEND MESSAGE (with reply support)
export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async ({ chatId, message, userId, userName, userPhoto, replyTo = null, replyToText = null, replyToUser = null }, { rejectWithValue }) => {
    try {
      const messageData = {
        text: message,
        userId,
        userName: userName || 'Unknown User',
        userPhoto: userPhoto || null,
        timestamp: firestore.FieldValue.serverTimestamp(),
        replyTo,
        replyToText,
        replyToUser,
        edited: false,
        editHistory: [], // Initialize empty edit history
      };

      const docRef = await firestore()
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .add(messageData);

      await firestore()
        .collection('chats')
        .doc(chatId)
        .update({
          lastMessage: message,
          lastMessageTime: firestore.FieldValue.serverTimestamp(),
        });

      return {
        id: docRef.id,
        ...messageData,
        timestamp: new Date(),
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// ✅ EDIT MESSAGE WITH HISTORY TRACKING
export const editMessage = createAsyncThunk(
  'chat/editMessage',
  async ({ chatId, messageId, newText, currentMessage }, { rejectWithValue }) => {
    try {
      // Create new edit history entry
      const newEditEntry = {
        text: currentMessage.text,
        editedAt: firestore.FieldValue.serverTimestamp(),
        version: (currentMessage.editHistory?.length || 0) + 1
      };

      // Update existing edit history
      const updatedEditHistory = [
        ...(currentMessage.editHistory || []),
        newEditEntry
      ];

      await firestore()
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .doc(messageId)
        .update({
          text: newText,
          edited: true,
          editedAt: firestore.FieldValue.serverTimestamp(),
          editHistory: updatedEditHistory,
        });

      return { messageId, newText, editHistory: updatedEditHistory };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// ✅ DELETE MESSAGE
export const deleteMessage = createAsyncThunk(
  'chat/deleteMessage',
  async ({ chatId, messageId }, { rejectWithValue }) => {
    try {
      await firestore()
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .doc(messageId)
        .delete();

      return messageId;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// ✅ GET EDIT HISTORY FOR A MESSAGE
export const getEditHistory = createAsyncThunk(
  'chat/getEditHistory',
  async ({ chatId, messageId }, { rejectWithValue }) => {
    try {
      const messageDoc = await firestore()
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .doc(messageId)
        .get();

      if (messageDoc.exists) {
        const data = messageDoc.data();
        return {
          messageId,
          editHistory: data.editHistory || [],
          originalText: data.text,
          timestamp: data.timestamp,
          editedAt: data.editedAt
        };
      }
      
      return rejectWithValue('Message not found');
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Helper function to format edit history for display
const formatEditHistoryForDisplay = (message) => {
  if (!message.edited || !message.editHistory) {
    return [];
  }

  const history = [
    // Original message (first version)
    {
      text: message.editHistory[0]?.text || message.text,
      editedAt: message.timestamp,
      version: 0,
      isOriginal: true
    },
    // All intermediate versions
    ...message.editHistory.slice(0, -1).map((edit, index) => ({
      ...edit,
      version: index + 1,
      isOriginal: false
    })),
    // Current version (latest)
    {
      text: message.text,
      editedAt: message.editedAt,
      version: message.editHistory.length,
      isOriginal: false,
      isCurrent: true
    }
  ];

  return history.filter(item => item.text); // Remove empty entries
};

// ✅ SLICE
const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    messages: [],
    chats: [],
    editHistory: {},
    isLoading: false,
    error: null,
  },
  reducers: {
    setMessages: (state, action) => {
      state.messages = action.payload.map(message => ({
        id: message.id,
        text: message.text,
        userId: message.userId,
        userName: message.userName || message.name || 'Unknown User',
        userPhoto: message.userPhoto || message.photo || null,
        timestamp: message.timestamp?.toDate ? message.timestamp.toDate() : message.timestamp,
        editedAt: message.editedAt?.toDate ? message.editedAt.toDate() : message.editedAt,
        edited: message.edited || false,
        replyTo: message.replyTo || null,
        replyToText: message.replyToText || null,
        replyToUser: message.replyToUser || null,
        editHistory: message.editHistory || [],
      }));
    },
    setChats: (state, action) => {
      state.chats = action.payload.map(chat => ({
        ...chat,
        createdAt: chat.createdAt?.toDate ? chat.createdAt.toDate() : chat.createdAt,
        lastMessageTime: chat.lastMessageTime?.toDate ? chat.lastMessageTime.toDate() : chat.lastMessageTime,
      }));
    },
    clearEditHistory: (state, action) => {
      if (action.payload) {
        delete state.editHistory[action.payload];
      } else {
        state.editHistory = {};
      }
    },
    // Add local edit history for immediate UI updates
    addEditToHistory: (state, action) => {
      const { messageId, editData } = action.payload;
      if (!state.editHistory[messageId]) {
        state.editHistory[messageId] = [];
      }
      state.editHistory[messageId].push(editData);
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendMessage.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      .addCase(editMessage.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(editMessage.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(editMessage.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      .addCase(deleteMessage.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteMessage.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(deleteMessage.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  }
});

export const { setMessages, setChats } = chatSlice.actions;
export default chatSlice.reducer;
