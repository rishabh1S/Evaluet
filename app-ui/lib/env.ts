import Constants from 'expo-constants'

const host =
  Constants.expoConfig?.hostUri?.split(':').shift() ??
  'localhost'

export const API_BASE = `http://${host}:8000`
export const WS_BASE = `ws://${host}:8000`