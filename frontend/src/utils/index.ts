import { clsx, type ClassValue } from 'clsx';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

// Утилита для объединения классов CSS
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// Форматирование валюты
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Форматирование числа
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('ru-RU').format(value);
}

// Форматирование даты
export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'dd.MM.yyyy', { locale: ru });
}

// Форматирование даты и времени
export function formatDateTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'dd.MM.yyyy HH:mm', { locale: ru });
}

// Относительное время
export function formatRelativeTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix: true, locale: ru });
}

// Получение цвета статуса товара
export function getProductStatusColor(status: string): string {
  switch (status) {
    case 'active':
      return 'text-green-600 bg-green-100';
    case 'inactive':
      return 'text-yellow-600 bg-yellow-100';
    case 'discontinued':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

// Получение цвета уровня остатков
export function getStockLevelColor(current: number, min: number, max?: number): string {
  if (current === 0) {
    return 'text-red-600 bg-red-100'; // Нет в наличии
  }
  if (current <= min) {
    return 'text-orange-600 bg-orange-100'; // Низкий остаток
  }
  if (max && current >= max) {
    return 'text-blue-600 bg-blue-100'; // Избыток
  }
  return 'text-green-600 bg-green-100'; // Нормальный остаток
}

// Получение текста статуса товара
export function getProductStatusText(status: string): string {
  switch (status) {
    case 'active':
      return 'Активный';
    case 'inactive':
      return 'Неактивный';
    case 'discontinued':
      return 'Снят с производства';
    default:
      return 'Неизвестно';
  }
}

// Получение текста уровня остатков
export function getStockLevelText(current: number, min: number, max?: number): string {
  if (current === 0) {
    return 'Нет в наличии';
  }
  if (current <= min) {
    return 'Низкий остаток';
  }
  if (max && current >= max) {
    return 'Избыток';
  }
  return 'В наличии';
}

// Дебаунс функция
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Генерация случайного ID
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

// Проверка валидности email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Проверка валидности телефона
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

// Сокращение текста
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substr(0, maxLength) + '...';
}

// Капитализация первой буквы
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Получение инициалов из имени
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Скачивание файла
export function downloadFile(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

// Копирование в буфер обмена
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    // Fallback для старых браузеров
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  }
}

// Проверка поддержки функций браузера
export const browserSupport = {
  clipboard: !!navigator.clipboard,
  notifications: 'Notification' in window,
  serviceWorker: 'serviceWorker' in navigator,
  webShare: !!navigator.share,
}; 