import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { ApiError, AuthTokens } from '../types';

// Базовый URL API
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

// Создание экземпляра axios
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Интерсептор для добавления токена авторизации
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Интерсептор для обработки ответов
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // Если ошибка 401 - перенаправляем на логин (refresh_token может отсутствовать)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      console.log('❌ 401 ошибка - токен недействителен, перенаправляем на логин');
      
      // Очищаем токены и перенаправляем на логин
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Обработка других ошибок
    const apiError: ApiError = {
      detail: error.response?.data?.detail || error.message || 'Произошла ошибка',
      status_code: error.response?.status || 500,
    };

    return Promise.reject(apiError);
  }
);

export default api; 