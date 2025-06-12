import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  StatusBar,
  Alert,
} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {getFirestore, collection, doc, setDoc, serverTimestamp, query, where, onSnapshot} from '@react-native-firebase/firestore';
import {signOut} from '../redux/slices/authSlice';
import {setChats} from '../redux/slices/chatSlice';

const ChatListScreen = ({navigation}) => {
  const dispatch = useDispatch();
  const {user} = useSelector(state => state.auth);
  const {chats} = useSelector(state => state.chat);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const db = getFirestore();
    
    // Listen to users
    const usersQuery = query(
      collection(db, 'users'),
      where('uid', '!=', user.uid)
    );
    
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      const usersList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(usersList);
    });

    return () => unsubscribeUsers();
  }, [user.uid]);

  const createChat = async otherUser => {
    const chatId = [user.uid, otherUser.uid].sort().join('_');

    try {
      const db = getFirestore();
      const chatRef = doc(db, 'chats', chatId);
      
      await setDoc(chatRef, {
        participants: [user.uid, otherUser.uid],
        participantDetails: {
          [user.uid]: {
            name: user.displayName,
            photo: user.photoURL,
          },
          [otherUser.uid]: {
            name: otherUser.displayName,
            photo: otherUser.photoURL,
          },
        },
        createdAt: serverTimestamp(),
        lastMessage: '',
        lastMessageTime: serverTimestamp(),
      }, {merge: true});

      navigation.navigate('Chat', {
        chatId,
        otherUser,
      });
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };

  const handleSignOut = async () => {
    await dispatch(signOut());
  };

  const filteredUsers = users.filter(u =>
    u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const renderUserItem = ({item}) => (
    <TouchableOpacity
      onPress={() => createChat(item)}
      className="flex-row items-center p-4 bg-white mx-4 mb-2 rounded-xl shadow-sm">
      <Image
        source={{uri: item.photoURL}}
        className="w-12 h-12 rounded-full mr-4"
      />
      <View className="flex-1">
        <Text className="font-semibold text-gray-900 text-lg">
          {item.displayName}
        </Text>
        <Text className="text-gray-500 text-sm">{item.email}</Text>
      </View>
      <View
        className={`w-3 h-3 rounded-full ${
          item.isOnline ? 'bg-green-500' : 'bg-gray-300'
        }`}
      />
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {/* Header */}
      <View className="bg-white px-4 py-6 shadow-sm">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-2xl font-bold text-gray-900">Chats</Text>
          <TouchableOpacity
            onPress={handleSignOut}
            className="w-10 h-10 rounded-full overflow-hidden">
            <Image source={{uri: user.photoURL}} className="w-full h-full" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View className="bg-gray-100 rounded-xl px-4 py-3">
          <TextInput
            placeholder="Search users..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="text-gray-700 text-base"
            placeholderTextColor="#9CA3AF"
          />
        </View>
      </View>

      {/* Users List */}
      <FlatList
        data={filteredUsers}
        renderItem={renderUserItem}
        keyExtractor={item => item.id}
        contentContainerStyle={{paddingVertical: 16}}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

export default ChatListScreen;