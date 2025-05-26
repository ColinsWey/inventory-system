import api from './api';
import { User, LoginRequest, AuthTokens, ApiResponse } from '../types';

export const authService = {
  // Авторизация пользователя
  async login(credentials: LoginRequest): Promise<AuthTokens> {
    const formData = new FormData();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);

    const response = await api.post<AuthTokens>('/auth/login', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    // Сохраняем токены в localStorage
    localStorage.setItem('access_token', response.data.access_token);
    localStorage.setItem('refresh_token', response.data.refresh_token);

    return response.data;
  },

  // Выход из системы
  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Игнорируем ошибки при выходе
    } finally {
      // Очищаем токены из localStorage
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  },

  // Получение информации о текущем пользователе
  async getCurrentUser(): Promise<User> {
    const response = await api.get<ApiResponse<User>>('/auth/me');
    return response.data.data;
  },

  // Обновление токена
  async refreshToken(): Promise<AuthTokens> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      throw new Error('Refresh token not found');
    }

    const response = await api.post<AuthTokens>('/auth/refresh', {
      refresh_token: refreshToken,
    });

    // Обновляем токены в localStorage
    localStorage.setItem('access_token', response.data.access_token);
    localStorage.setItem('refresh_token', response.data.refresh_token);

    return response.data;
  },

  // Проверка авторизации
  isAuthenticated(): boolean {
    const token = localStorage.getItem('access_token');
    return !!token;
  },

  // Получение токена
  getToken(): string | null {
    return localStorage.getItem('access_token');
  },
}; 