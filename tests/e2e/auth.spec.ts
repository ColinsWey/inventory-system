/**
 * E2E тесты для системы авторизации
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Авторизация в системе', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('Успешная авторизация с корректными данными admin/admin', async () => {
    // Given: пользователь на странице входа
    await expect(page.locator('h1')).toContainText('Вход в систему');
    
    // When: вводим корректные данные для входа
    await page.fill('[data-testid="username-input"]', 'admin');
    await page.fill('[data-testid="password-input"]', 'admin');
    await page.click('[data-testid="login-button"]');
    
    // Then: пользователь должен быть перенаправлен на главную страницу
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    await expect(page.locator('[data-testid="logout-button"]')).toBeVisible();
    
    // Проверяем, что отображается приветствие
    await expect(page.locator('[data-testid="welcome-message"]')).toContainText('Добро пожаловать, admin');
  });

  test('Неуспешная авторизация с неверным паролем', async () => {
    // Given: пользователь на странице входа
    
    // When: вводим неверный пароль
    await page.fill('[data-testid="username-input"]', 'admin');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    await page.click('[data-testid="login-button"]');
    
    // Then: должно появиться сообщение об ошибке
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Неверный логин или пароль');
    
    // Пользователь остается на странице входа
    await expect(page).toHaveURL('/');
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
  });

  test('Неуспешная авторизация с неверным логином', async () => {
    // Given: пользователь на странице входа
    
    // When: вводим неверный логин
    await page.fill('[data-testid="username-input"]', 'wronguser');
    await page.fill('[data-testid="password-input"]', 'admin');
    await page.click('[data-testid="login-button"]');
    
    // Then: должно появиться сообщение об ошибке
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Неверный логин или пароль');
  });

  test('Валидация пустых полей', async () => {
    // Given: пользователь на странице входа
    
    // When: пытаемся войти с пустыми полями
    await page.click('[data-testid="login-button"]');
    
    // Then: должны появиться сообщения о валидации
    await expect(page.locator('[data-testid="username-error"]')).toContainText('Введите логин');
    await expect(page.locator('[data-testid="password-error"]')).toContainText('Введите пароль');
  });

  test('Проверка JWT токена после авторизации', async () => {
    // Given: успешная авторизация
    await page.fill('[data-testid="username-input"]', 'admin');
    await page.fill('[data-testid="password-input"]', 'admin');
    await page.click('[data-testid="login-button"]');
    
    await expect(page).toHaveURL('/dashboard');
    
    // When: проверяем наличие токена в localStorage
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    
    // Then: токен должен быть сохранен
    expect(token).toBeTruthy();
    expect(token).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/); // JWT формат
  });

  test('Автоматический logout при истечении токена', async () => {
    // Given: авторизованный пользователь с истекшим токеном
    await page.fill('[data-testid="username-input"]', 'admin');
    await page.fill('[data-testid="password-input"]', 'admin');
    await page.click('[data-testid="login-button"]');
    
    await expect(page).toHaveURL('/dashboard');
    
    // When: устанавливаем истекший токен
    await page.evaluate(() => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImV4cCI6MTYwMDAwMDAwMH0.invalid';
      localStorage.setItem('auth_token', expiredToken);
    });
    
    // Обновляем страницу
    await page.reload();
    
    // Then: пользователь должен быть перенаправлен на страницу входа
    await expect(page).toHaveURL('/');
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
  });

  test('Ручной logout', async () => {
    // Given: авторизованный пользователь
    await page.fill('[data-testid="username-input"]', 'admin');
    await page.fill('[data-testid="password-input"]', 'admin');
    await page.click('[data-testid="login-button"]');
    
    await expect(page).toHaveURL('/dashboard');
    
    // When: нажимаем кнопку выхода
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');
    
    // Then: пользователь должен быть перенаправлен на страницу входа
    await expect(page).toHaveURL('/');
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
    
    // Токен должен быть удален
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token).toBeNull();
  });

  test('Защита от CSRF атак', async () => {
    // Given: попытка отправить запрос без CSRF токена
    
    // When: делаем прямой POST запрос на /api/auth/login
    const response = await page.request.post('/api/auth/login', {
      data: {
        username: 'admin',
        password: 'admin'
      }
    });
    
    // Then: запрос должен быть отклонен без CSRF токена
    expect(response.status()).toBe(403);
  });

  test('Блокировка после нескольких неудачных попыток', async () => {
    // Given: несколько неудачных попыток входа
    
    for (let i = 0; i < 5; i++) {
      await page.fill('[data-testid="username-input"]', 'admin');
      await page.fill('[data-testid="password-input"]', 'wrongpassword');
      await page.click('[data-testid="login-button"]');
      
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await page.waitForTimeout(1000); // Небольшая пауза между попытками
    }
    
    // When: пытаемся войти с правильными данными
    await page.fill('[data-testid="username-input"]', 'admin');
    await page.fill('[data-testid="password-input"]', 'admin');
    await page.click('[data-testid="login-button"]');
    
    // Then: аккаунт должен быть временно заблокирован
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Аккаунт временно заблокирован');
  });

  test('Сохранение состояния авторизации при обновлении страницы', async () => {
    // Given: авторизованный пользователь
    await page.fill('[data-testid="username-input"]', 'admin');
    await page.fill('[data-testid="password-input"]', 'admin');
    await page.click('[data-testid="login-button"]');
    
    await expect(page).toHaveURL('/dashboard');
    
    // When: обновляем страницу
    await page.reload();
    
    // Then: пользователь должен остаться авторизованным
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('Перенаправление на запрошенную страницу после авторизации', async () => {
    // Given: пользователь пытается зайти на защищенную страницу без авторизации
    await page.goto('/products');
    
    // Should be redirected to login
    await expect(page).toHaveURL('/?redirect=/products');
    
    // When: авторизуемся
    await page.fill('[data-testid="username-input"]', 'admin');
    await page.fill('[data-testid="password-input"]', 'admin');
    await page.click('[data-testid="login-button"]');
    
    // Then: должны быть перенаправлены на изначально запрошенную страницу
    await expect(page).toHaveURL('/products');
  });

  test('Проверка безопасности паролей', async () => {
    // Given: страница входа
    
    // When: вводим пароль
    await page.fill('[data-testid="password-input"]', 'admin');
    
    // Then: поле пароля должно быть скрыто
    const passwordInput = page.locator('[data-testid="password-input"]');
    await expect(passwordInput).toHaveAttribute('type', 'password');
    
    // Проверяем кнопку показать/скрыть пароль
    await page.click('[data-testid="toggle-password-visibility"]');
    await expect(passwordInput).toHaveAttribute('type', 'text');
    
    await page.click('[data-testid="toggle-password-visibility"]');
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('Проверка доступности (accessibility)', async () => {
    // Given: страница входа
    
    // When: проверяем доступность элементов
    
    // Then: все элементы должны иметь правильные ARIA атрибуты
    await expect(page.locator('[data-testid="username-input"]')).toHaveAttribute('aria-label', 'Логин');
    await expect(page.locator('[data-testid="password-input"]')).toHaveAttribute('aria-label', 'Пароль');
    await expect(page.locator('[data-testid="login-button"]')).toHaveAttribute('aria-label', 'Войти в систему');
    
    // Проверяем навигацию с клавиатуры
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="username-input"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="password-input"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="login-button"]')).toBeFocused();
  });

  test('Проверка мобильной версии', async ({ browser }) => {
    // Given: мобильное устройство
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 667 } // iPhone размер
    });
    const mobilePage = await mobileContext.newPage();
    
    await mobilePage.goto('/');
    
    // When: проверяем адаптивность формы входа
    
    // Then: форма должна корректно отображаться на мобильном
    await expect(mobilePage.locator('[data-testid="login-form"]')).toBeVisible();
    await expect(mobilePage.locator('[data-testid="username-input"]')).toBeVisible();
    await expect(mobilePage.locator('[data-testid="password-input"]')).toBeVisible();
    await expect(mobilePage.locator('[data-testid="login-button"]')).toBeVisible();
    
    // Проверяем, что кнопка достаточно большая для касания
    const loginButton = mobilePage.locator('[data-testid="login-button"]');
    const buttonBox = await loginButton.boundingBox();
    expect(buttonBox?.height).toBeGreaterThanOrEqual(44); // Минимальный размер для касания
    
    await mobileContext.close();
  });

  test('Проверка темной темы', async () => {
    // Given: пользователь переключает на темную тему
    await page.click('[data-testid="theme-toggle"]');
    
    // When: проверяем применение темной темы
    
    // Then: элементы должны иметь темную тему
    await expect(page.locator('body')).toHaveClass(/dark-theme/);
    await expect(page.locator('[data-testid="login-form"]')).toHaveCSS('background-color', 'rgb(31, 41, 55)');
  });

  test('Интернационализация - переключение языка', async () => {
    // Given: страница входа на русском языке
    await expect(page.locator('h1')).toContainText('Вход в систему');
    
    // When: переключаем на английский язык
    await page.click('[data-testid="language-selector"]');
    await page.click('[data-testid="language-en"]');
    
    // Then: интерфейс должен переключиться на английский
    await expect(page.locator('h1')).toContainText('Login');
    await expect(page.locator('[data-testid="login-button"]')).toContainText('Sign In');
  });
}); 