module.exports = {
  project: {
    ios: {},
    android: {},
  },
  assets: ['./src/assets/fonts'],
  'react-native-vector-icons': {
    platforms: {
      ios: null,
      android:null, // Exclude iOS linking if you handle it manually
    },
  },
};
