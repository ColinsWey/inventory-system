import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// Базовый URL API
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

// Создание экземпляра axios
const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Интерцептор для добавления токена авторизации
apiClient.interceptors.request.use(
  (config: AxiosRequestConfig) => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Интерцептор для обработки ответов
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    // Обработка ошибок авторизации
    if (error.response?.status === 401) {
      // Удаляем токен и перенаправляем на логин
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

export default apiClient; 