import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, Image, 
  Alert, Animated, TouchableWithoutFeedback, PanResponder, Dimensions, Platform
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { getFirestore, collection, doc, query, orderBy, onSnapshot, updateDoc, deleteDoc } from '@react-native-firebase/firestore';
import { sendMessage, setMessages } from '../redux/slices/chatSlice';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MODAL_WIDTH = 140;

const ChatScreen = ({ route, navigation }) => {
  const { chatId, otherUser } = route.params;
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const { messages } = useSelector(state => state.chat);
  const insets = useSafeAreaInsets();
 
  const tabBarHeight = 0; // Since we're in a stack screen, no tab bar is visible
  
  const [messageText, setMessageText] = useState('');
  const [editingMessage, setEditingMessage] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 2 });
  const [historyData, setHistoryData] = useState([]);
  
  const flatListRef = useRef(null);
  const bottomSheetRef = useRef(null);
  const snapPoints = ['60%'];

  // Setup header with user info
  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View className="flex-row items-center">
          {otherUser?.photoURL && (
            <Image source={{ uri: otherUser.photoURL }} className="w-8 h-8 rounded-full mr-3" />
          )}
          <Text className="font-semibold text-lg text-gray-900">
            {otherUser?.displayName || 'Unknown User'}
          </Text>
        </View>
      ),
    });
  }, [navigation, otherUser]);

  // Real-time messages listener
  useEffect(() => {
    if (!chatId) return;

    const db = getFirestore();
    const messagesQuery = query(
      collection(db, 'chats', chatId, 'messages'), 
      orderBy('timestamp', 'asc')
    );

    return onSnapshot(messagesQuery, snapshot => {
      const messagesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()?.toISOString() || new Date().toISOString(),
        editedAt: doc.data().editedAt?.toDate()?.toISOString(),
      }));
      dispatch(setMessages(messagesList));
    });
  }, [chatId, dispatch]);

  const sendMessageHandler = useCallback(async () => {
    if (!messageText.trim()) return;

    const payload = {
      chatId,
      message: messageText.trim(),
      userId: user.uid,
      userName: user.displayName || 'Unknown',
      userPhoto: user.photoURL,
      ...(replyingTo && {
        replyTo: replyingTo.id,
        replyToText: replyingTo.text,
        replyToUser: replyingTo.userName,
      }),
    };

    try {
      if (editingMessage) {
        await editMessage(editingMessage.id, messageText.trim());
        setEditingMessage(null);
      } else {
        await dispatch(sendMessage(payload));
        setReplyingTo(null);
      }
      setMessageText('');
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
    }
  }, [messageText, editingMessage, replyingTo, chatId, user, dispatch]);

  const editMessage = async (messageId, newText) => {
    const db = getFirestore();
    const originalMessage = messages.find(msg => msg.id === messageId);
    
    const editEntry = {
      text: originalMessage.text,
      editedAt: new Date(),
      version: (originalMessage.editHistory?.length || 0) + 1
    };

    await updateDoc(doc(db, 'chats', chatId, 'messages', messageId), {
      text: newText,
      edited: true,
      editedAt: new Date(),
      editHistory: [...(originalMessage.editHistory || []), editEntry],
    });
  };

  const deleteMessage = async (messageId) => {
    await deleteDoc(doc(db, 'chats', chatId, 'messages', messageId));
  };

  const showOptionsModal = (item, event) => {
    const { pageX, pageY } = event.nativeEvent;
    
    const modalX = Math.min(Math.max(10, pageX - MODAL_WIDTH/2), SCREEN_WIDTH - MODAL_WIDTH - 10);
    const modalY = Math.max(100, pageY - 60);
    
    setSelectedMessage(item);
    setModalPosition({ x: modalX, y: modalY });
    setModalVisible(true);
  };

  const showEditHistory = (message) => {
    const history = [
      {
        text: message.editHistory?.[0]?.text || message.text,
        editedAt: message.timestamp,
        version: 0,
        label: 'Original'
      },
      ...(message.editHistory?.slice(0, -1) || []).map((edit, idx) => ({
        ...edit,
        version: idx + 1,
        label: `Edit ${idx + 1}`
      })),
      {
        text: message.text,
        editedAt: message.editedAt || message.timestamp,
        version: message.editHistory?.length || 0,
        label: 'Current'
      }
    ];

    setHistoryData(history);
    bottomSheetRef.current?.expand();
  };

  const formatTime = (date) => {
    const now = new Date();
    const time = new Date(date);
    const diffMinutes = Math.floor((now - time) / 60000);
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h`;
    return time.toLocaleDateString();
  };

  const MessageBubble = ({ item }) => {
    const isMyMessage = item.userId === user.uid;

    return (
      <TouchableOpacity onLongPress={(e) => showOptionsModal(item, e)} activeOpacity={0.8}>
        <View className={`flex-row mb-4 px-4 ${isMyMessage ? 'justify-end' : 'justify-start'}`}>
          {!isMyMessage && item.userPhoto && (
            <Image source={{ uri: item.userPhoto }} className="w-8 h-8 rounded-full mr-2 mt-1" />
          )}
          
          <View className="max-w-xs">
            {/* Reply Preview */}
            {item.replyTo && (
              <View className={`mb-2 p-2 rounded-lg border-l-4 ${
                isMyMessage ? 'bg-blue-100 border-blue-300' : 'bg-gray-100 border-gray-300'
              }`}>
                <Text className="text-xs text-gray-600 font-medium">{item.replyToUser}</Text>
                <Text className="text-sm text-gray-700" numberOfLines={2}>{item.replyToText}</Text>
              </View>
            )}
            
            {/* Edit Indicator */}
            {item.edited && (
              <TouchableOpacity onPress={() => showEditHistory(item)} className="mb-1">
                <Text className="text-xs text-gray-500 italic">
                  edited {formatTime(item.editedAt)} • tap for history
                </Text>
              </TouchableOpacity>
            )}
            
            {/* Message Content */}
            <View className={`px-4 py-3 rounded-2xl ${
              isMyMessage 
                ? 'bg-blue-500 rounded-br-md' 
                : 'bg-gray-200 rounded-bl-md'
            }`}>
              <Text className={`text-base ${isMyMessage ? 'text-white' : 'text-gray-900'}`}>
                {item.text}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const OptionsModal = () => (
    modalVisible && (
      <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
        <View className="absolute inset-0">
          <View 
            style={{
              position: 'absolute',
              left: modalPosition.x,
              top: modalPosition.y,
              width: MODAL_WIDTH,
            }}
            className="bg-white rounded-xl shadow-2xl"
          >
            {/* Arrow pointer */}
            <View className="absolute -top-1.5 left-4 w-3 h-3 bg-white rotate-45" />
            
            <View className="overflow-hidden rounded-xl py-1">
              <TouchableOpacity 
                onPress={() => {
                  setReplyingTo(selectedMessage);
                  setModalVisible(false);
                }}
                className="px-4 py-3 active:bg-gray-50"
              >
                <Text className="text-gray-900 font-medium text-center">Reply</Text>
              </TouchableOpacity>

              {selectedMessage?.userId === user.uid && (
                <>
                  <TouchableOpacity
                    onPress={() => {
                      setEditingMessage(selectedMessage);
                      setMessageText(selectedMessage.text);
                      setModalVisible(false);
                    }}
                    className="px-4 py-3 active:bg-gray-50 border-t border-gray-100"
                  >
                    <Text className="text-gray-900 font-medium text-center">Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setModalVisible(false);
                      Alert.alert('Delete Message', 'This action cannot be undone.', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => deleteMessage(selectedMessage.id) }
                      ]);
                    }}
                    className="px-4 py-3 active:bg-red-50 border-t border-gray-100"
                  >
                    <Text className="text-red-500 font-medium text-center">Delete</Text>
                  </TouchableOpacity>
                </>
              )}

              {selectedMessage?.edited && (
                <TouchableOpacity 
                  onPress={() => {
                    showEditHistory(selectedMessage);
                    setModalVisible(false);
                  }}
                  className="px-4 py-3 active:bg-gray-50 border-t border-gray-100"
                >
                  <Text className="text-gray-900 font-medium text-center">History</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    )
  );

  return (
    <GestureHandlerRootView className="flex-1 bg-white">
      <KeyboardAvoidingView 
        className="flex-1" 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={({ item }) => <MessageBubble item={item} />}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingVertical: 16 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        />

        {/* Reply Banner */}
        {replyingTo && (
          <View className="px-4 py-2 bg-gray-100 border-t border-gray-200">
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-700">↩ {replyingTo.userName}</Text>
                <Text className="text-sm text-gray-600" numberOfLines={1}>{replyingTo.text}</Text>
              </View>
              <TouchableOpacity onPress={() => setReplyingTo(null)} className="p-1">
                <Text className="text-gray-500 text-lg">×</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Input Section */}
        <View className="flex-row items-center p-4 border-t border-gray-200" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
          <TextInput
            value={messageText}
            onChangeText={setMessageText}
            placeholder={editingMessage ? "Edit message..." : "Message..."}
            className="flex-1 bg-gray-100 rounded-full px-4 py-3 mr-3 text-base max-h-24"
            placeholderTextColor="#9CA3AF"
            multiline
          />
          <TouchableOpacity 
            onPress={sendMessageHandler}
            disabled={!messageText.trim()}
            className={`w-12 h-12 rounded-full justify-center items-center ${
              messageText.trim() ? 'bg-blue-500' : 'bg-gray-300'
            }`}
          >
            <Text className="text-white text-xl font-semibold">
              {editingMessage ? '✓' : '→'}
            </Text>
          </TouchableOpacity>
        </View>

        <OptionsModal />

        {/* Edit History Bottom Sheet */}
        <BottomSheet 
          ref={bottomSheetRef} 
          snapPoints={snapPoints} 
          index={-1}
          enablePanDownToClose
          backgroundStyle={{ backgroundColor: '#f9fafb' }}
          handleIndicatorStyle={{ backgroundColor: '#d1d5db' }}
        >
          <View className="px-4 pb-3 border-b border-gray-200 bg-white">
            <Text className="text-xl font-bold text-gray-900">Edit History</Text>
            <Text className="text-sm text-gray-600">{historyData.length} versions</Text>
          </View>
          
          <BottomSheetScrollView contentContainerStyle={{ padding: 16 }}>
            {historyData.map((item, index) => (
              <View key={index} className="mb-4 p-4 bg-white rounded-xl shadow-sm">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center">
                    <View className={`w-3 h-3 rounded-full mr-2 ${
                      item.label === 'Current' ? 'bg-green-500' : 
                      item.label === 'Original' ? 'bg-blue-500' : 'bg-gray-400'
                    }`} />
                    <Text className="font-medium text-gray-700">{item.label}</Text>
                  </View>
                  <Text className="text-xs text-gray-500">{formatTime(item.editedAt)}</Text>
                </View>
                <Text className="text-gray-900 leading-5">{item.text}</Text>
              </View>
            ))}
          </BottomSheetScrollView>
        </BottomSheet>
      </KeyboardAvoidingView>
    </GestureHandlerRootView>
  );
};

export default ChatScreen;