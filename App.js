import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from './src/redux/store';
import AppNavigator from './src/navigation/appNavigator';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import './global.css';


const App = () => {
 useEffect(() => {
 GoogleSignin.configure({
   webClientId: '443115023935-smlkfc0aabsutl03ps9gogs8qbdjbl53.apps.googleusercontent.com', // From Firebase Console
   offlineAccess: true,
 });
 }, [])


  return (
     <GestureHandlerRootView style={{ flex: 1 }}>
<Provider store={store}>
      <AppNavigator />
    </Provider>
     </GestureHandlerRootView>
    
  );
};

export default App;