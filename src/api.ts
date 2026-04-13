import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from './constants';

let memoryToken: string | null = null;
export const setMemoryToken = (val: string | null) => { memoryToken = val; };
export const getMemoryToken = () => memoryToken;

const api = axios.create({
  baseURL: API_URL,
  timeout: 5000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  let token = null;
  try {
    token = await AsyncStorage.getItem('token');
  } catch (e) {
    // Fallback if native module is missing
    token = memoryToken;
  }
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
