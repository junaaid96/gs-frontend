import Cookies from 'js-cookie';
import { LoginResponse, UserRole } from '@/types';

export const setAuthToken = (token: string) => {
  Cookies.set('token', token, { expires: 7 }); // 7 days
};

export const getAuthToken = (): string | undefined => {
  return Cookies.get('token');
};

export const removeAuthToken = () => {
  Cookies.remove('token');
  Cookies.remove('user');
};

export const setUser = (user: LoginResponse) => {
  Cookies.set('user', JSON.stringify(user), { expires: 7 });
};

export const getUser = (): LoginResponse | null => {
  const user = Cookies.get('user');
  return user ? JSON.parse(user) : null;
};

export const isAdmin = (): boolean => {
  const user = getUser();
  return user?.role === UserRole.ADMIN;
};

export const isSalesman = (): boolean => {
  const user = getUser();
  return user?.role === UserRole.SALESMAN;
};

export const isAuthenticated = (): boolean => {
  return !!getAuthToken();
};

