import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Mine, User } from '../types';

const TOKEN_KEY = 'minsos_token';
const USER_KEY = 'minsos_user';
const SELECTED_MINE_KEY = 'minsos_selected_mine';

export async function saveToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function saveUser(user: User): Promise<void> {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function getUser(): Promise<User | null> {
  const data = await AsyncStorage.getItem(USER_KEY);
  if (!data) {
    return null;
  }
  return JSON.parse(data) as User;
}

export async function saveSelectedMine(mine: Mine): Promise<void> {
  await AsyncStorage.setItem(SELECTED_MINE_KEY, JSON.stringify(mine));
}

export async function getSelectedMine(): Promise<Mine | null> {
  const data = await AsyncStorage.getItem(SELECTED_MINE_KEY);
  if (!data) {
    return null;
  }
  return JSON.parse(data) as Mine;
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY, SELECTED_MINE_KEY]);
}

export async function hasValidSession(): Promise<boolean> {
  const token = await getToken();
  return Boolean(token);
}
