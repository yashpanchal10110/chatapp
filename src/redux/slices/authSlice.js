import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getAuth, GoogleAuthProvider, signInWithCredential, signOut as firebaseSignOut } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, collection, doc, setDoc, updateDoc, serverTimestamp } from '@react-native-firebase/firestore';

export const googleSignIn = createAsyncThunk(
  'auth/googleSignIn',
  async (_, { rejectWithValue }) => {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const signInResult = await GoogleSignin.signIn();

      // Handle different response formats
      let idToken = signInResult?.data?.idToken || signInResult?.idToken;
      if (!idToken) throw new Error('No ID token found');

      const googleCredential = GoogleAuthProvider.credential(idToken);
      const auth = getAuth();
      const userCredential = await signInWithCredential(auth, googleCredential);
      
      // Save user to Firestore
      const user = userCredential.user;
      const db = getFirestore();
      const userRef = doc(db, 'users', user.uid);
      
      await setDoc(userRef, {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        lastSeen: serverTimestamp(),
        isOnline: true,
      }, { merge: true });

      // Return serializable user data
      const userData = {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
      };

      await AsyncStorage.setItem('user', JSON.stringify(userData));
      return userData;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const signOut = createAsyncThunk(
  'auth/signOut',
  async (_, { rejectWithValue }) => {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (currentUser) {
        // Update user offline status
        const db = getFirestore();
        const userRef = doc(db, 'users', currentUser.uid);
        
        await updateDoc(userRef, {
          isOnline: false,
          lastSeen: serverTimestamp(),
        });
      }

      await GoogleSignin.revokeAccess();
      await GoogleSignin.signOut();
      await firebaseSignOut(auth);
      await AsyncStorage.removeItem('user');
      return null;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    isLoading: false,
    error: null,
    isAuthenticated: false,
  },
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    setUserOnlineStatus: (state, action) => {
      if (state.user) {
        state.user.isOnline = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(googleSignIn.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(googleSignIn.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(googleSignIn.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(signOut.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
      });
  },
});

export const { setUser, clearError, setUserOnlineStatus } = authSlice.actions;
export default authSlice.reducer;