import api from './api';
import { User, LoginRequest, AuthTokens, ApiResponse } from '../types';

export const authService = {
  // Авторизация пользователя
  async login(credentials: LoginRequest): Promise<AuthTokens> {
    console.log('🔐 authService.login() вызван с данными:', credentials);
    
    // Отправляем JSON вместо FormData
    const loginData = {
      username: credentials.username,
      password: credentials.password
    };
    
    console.log('📤 Отправляем JSON данные:', loginData);

    const response = await api.post<AuthTokens>('/auth/login', loginData);
    
    console.log('📥 Получен ответ от сервера:', response.data);

    // Сохраняем только access_token (refresh_token может отсутствовать)
    localStorage.setItem('access_token', response.data.access_token);
    if (response.data.refresh_token) {
      localStorage.setItem('refresh_token', response.data.refresh_token);
      console.log('💾 Сохранен refresh_token');
    } else {
      console.log('⚠️ refresh_token отсутствует в ответе');
    }
    
    console.log('✅ Авторизация успешна');
    return response.data;
  },

  // Выход из системы
  async logout(): Promise<void> {
    console.log('🚪 authService.logout() вызван');
    try {
      await api.post('/auth/logout');
      console.log('✅ Logout запрос успешен');
    } catch (error) {
      console.log('⚠️ Ошибка logout запроса (игнорируем):', error);
    } finally {
      // Очищаем токены из localStorage
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      console.log('🗑️ Токены удалены из localStorage');
    }
  },

  // Получение информации о текущем пользователе
  async getCurrentUser(): Promise<User> {
    console.log('👤 authService.getCurrentUser() вызван');
    const response = await api.get<any>('/auth/me');
    console.log('📥 Ответ /auth/me:', response.data);
    
    // Backend возвращает пользователя в поле user, а не data.data
    const user = response.data.user || response.data;
    console.log('✅ Получен пользователь:', user);
    return user;
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