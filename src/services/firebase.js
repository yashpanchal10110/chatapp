// import { initializeApp } from '@react-native-firebase/app';
// import auth from '@react-native-firebase/auth';
// import firestore from '@react-native-firebase/firestore';

// const firebaseConfig = {
//   // Your Firebase config
// };

// const app = initializeApp(firebaseConfig);
// export const db = firestore();
// export const authentication = auth();

// export default app;

import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// No need to initialize - React Native Firebase uses native configuration
export const db = firestore();
export const authentication = auth();

export default {
  auth: authentication,
  firestore: db,
};