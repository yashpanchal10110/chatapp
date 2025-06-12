import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';
import AuthScreen from '../screens/authScreen';
import ChatListScreen from '../screens/chatListScreen';
import ChatScreen from '../screens/chatScreen';
import { setUser } from '../redux/slices/authSlice';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    const checkAuthState = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          dispatch(setUser(JSON.parse(userData)));
        }
      } catch (error) {
        console.error('Error checking auth state:', error);
      }
    };

    checkAuthState();

    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        dispatch(setUser(null));
      }
    });

    return unsubscribe;
  }, [dispatch]);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : (
          <>
            <Stack.Screen name="ChatList" component={ChatListScreen} />
            <Stack.Screen
              name="Chat"
              component={ChatScreen}
              options={{
                headerShown: true,
                headerBackTitleVisible: false,
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;