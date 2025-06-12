import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StatusBar,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { googleSignIn } from '../redux/slices/authSlice';

const AuthScreen = () => {
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector((state) => state.auth);

  const handleGoogleSignIn = async () => {
    try {
      await dispatch(googleSignIn()).unwrap();
    } catch (error) {
      Alert.alert('Sign In Failed', error);
    }
  };

  return (
    <View className="flex-1 bg-gradient-to-br from-blue-500 to-purple-600">
      <StatusBar barStyle="light-content" backgroundColor="#007AFF" />
      
      <View className="flex-1 justify-center items-center px-8">
        {/* Logo/Icon */}
        <View className="mb-12">
          <View className="w-24 h-24 bg-white rounded-full justify-center items-center shadow-lg">
            <Text className="text-4xl">💬</Text>
          </View>
        </View>

        {/* Title */}
        <Text className="text-4xl font-bold text-white mb-4 text-center">
          ChatApp
        </Text>
        <Text className="text-lg text-white/80 mb-12 text-center px-4">
          Connect with friends and family instantly
        </Text>

        {/* Sign In Button */}
        <TouchableOpacity
          onPress={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full bg-white rounded-xl p-4 flex-row items-center justify-center shadow-lg active:scale-95"
          style={{ opacity: isLoading ? 0.7 : 1 }}
        >
          <Image
            source={{
              uri: 'https://developers.google.com/identity/images/g-logo.png',
            }}
            className="w-6 h-6 mr-3"
          />
          <Text className="text-gray-700 font-semibold text-lg">
            {isLoading ? 'Signing in...' : 'Continue with Google'}
          </Text>
        </TouchableOpacity>

        {/* Terms */}
        <Text className="text-white/60 text-sm mt-8 text-center px-4">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </View>
  );
};

export default AuthScreen;