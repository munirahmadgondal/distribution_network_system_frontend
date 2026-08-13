import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('dns_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url || '';
    const isLoginRequest = requestUrl.includes('/auth/login');

    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('dns_access_token');
      localStorage.removeItem('dns_user');
    }
    return Promise.reject(error);
  },
);

export interface LoginResponse {
  accessToken: string;
  user: {
    id: number;
    fullName: string;
    email: string;
    username: string;
    companyId: number | null;
    roles: string[];
    isSystemUser: boolean;
    permissions: PagePermission[];
  };
}

export interface PagePermission {
  pageKey: string;
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export type PermissionAction = 'view' | 'create' | 'update' | 'delete';

export function canAccess(user: LoginResponse['user'] | null, pageKey: string, action: PermissionAction = 'view') {
  if (!user) return false;
  if (user.roles?.includes('SUPER_ADMIN')) return true;
  const permission = user.permissions?.find((item) => item.pageKey === pageKey);
  return Boolean(permission?.[action === 'view' ? 'canView' : action === 'create' ? 'canCreate' : action === 'update' ? 'canUpdate' : 'canDelete']);
}

export async function login(email: string, password: string) {
  const { data } = await api.post<LoginResponse>('/auth/login', { email, password });
  localStorage.setItem('dns_access_token', data.accessToken);
  localStorage.setItem('dns_user', JSON.stringify(data.user));
  return data;
}

export function logout() {
  localStorage.removeItem('dns_access_token');
  localStorage.removeItem('dns_user');
}

export function getStoredUser(): LoginResponse['user'] | null {
  const raw = localStorage.getItem('dns_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    logout();
    return null;
  }
}

export async function getData<T>(path: string) {
  const { data } = await api.get<T>(path);
  return data;
}

export async function postData<T>(path: string, payload: unknown) {
  const { data } = await api.post<T>(path, payload);
  return data;
}

export async function patchData<T>(path: string, payload: unknown) {
  const { data } = await api.patch<T>(path, payload);
  return data;
}

export async function deleteData<T>(path: string) {
  const { data } = await api.delete<T>(path);
  return data;
}
