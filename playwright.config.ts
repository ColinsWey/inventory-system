import { defineConfig, devices } from '@playwright/test';

/**
 * Конфигурация Playwright для E2E тестирования
 * Система управления товарными остатками
 */
export default defineConfig({
  // Директория с тестами
  testDir: './tests/e2e',
  
  // Запуск тестов в полной изоляции
  fullyParallel: true,
  
  // Запрет на запуск тестов в CI если есть только .only
  forbidOnly: !!process.env.CI,
  
  // Количество повторов при падении теста
  retries: process.env.CI ? 2 : 0,
  
  // Количество параллельных воркеров
  workers: process.env.CI ? 1 : undefined,
  
  // Репортеры
  reporter: [
    ['html', { outputFolder: 'tests/reports/e2e-results' }],
    ['json', { outputFile: 'tests/reports/e2e-results.json' }],
    ['junit', { outputFile: 'tests/reports/e2e-results.xml' }],
    ['line']
  ],
  
  // Глобальные настройки для всех тестов
  use: {
    // Базовый URL приложения
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    
    // Трейсинг при падении тестов
    trace: 'on-first-retry',
    
    // Скриншоты при падении
    screenshot: 'only-on-failure',
    
    // Видео при падении
    video: 'retain-on-failure',
    
    // Таймауты
    actionTimeout: 10000,
    navigationTimeout: 30000,
    
    // Игнорирование HTTPS ошибок
    ignoreHTTPSErrors: true,
    
    // Дополнительные HTTP заголовки
    extraHTTPHeaders: {
      'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8'
    },
    
    // Локализация
    locale: 'ru-RU',
    timezoneId: 'Europe/Moscow',
    
    // Размер viewport по умолчанию
    viewport: { width: 1280, height: 720 }
  },

  // Проекты для разных браузеров и устройств
  projects: [
    // Настройка для всех тестов
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      teardown: 'cleanup'
    },
    
    // Очистка после тестов
    {
      name: 'cleanup',
      testMatch: /.*\.cleanup\.ts/
    },

    // Desktop Chrome
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Дополнительные аргументы для Chrome
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--no-sandbox'
          ]
        }
      },
      dependencies: ['setup']
    },

    // Desktop Firefox
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['setup']
    },

    // Desktop Safari
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      dependencies: ['setup']
    },

    // Mobile Chrome
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
      dependencies: ['setup']
    },

    // Mobile Safari
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
      dependencies: ['setup']
    },

    // Tablet
    {
      name: 'Tablet',
      use: { ...devices['iPad Pro'] },
      dependencies: ['setup']
    },

    // Проект для API тестов
    {
      name: 'api',
      testMatch: /.*\.api\.spec\.ts/,
      use: {
        baseURL: process.env.API_BASE_URL || 'http://localhost:8000'
      }
    },

    // Проект для тестов производительности
    {
      name: 'performance',
      testMatch: /.*\.performance\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--enable-precise-memory-info']
        }
      }
    },

    // Проект для accessibility тестов
    {
      name: 'accessibility',
      testMatch: /.*\.a11y\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] }
    }
  ],

  // Веб-сервер для разработки
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      NODE_ENV: 'test'
    }
  },

  // Глобальная настройка и очистка
  globalSetup: require.resolve('./tests/e2e/global-setup.ts'),
  globalTeardown: require.resolve('./tests/e2e/global-teardown.ts'),

  // Ожидание готовности приложения
  expect: {
    // Таймаут для expect
    timeout: 10000,
    
    // Мягкие проверки (не останавливают тест при падении)
    toHaveScreenshot: { 
      threshold: 0.2,
      mode: 'strict'
    },
    
    toMatchSnapshot: { 
      threshold: 0.2 
    }
  },

  // Метаданные для отчетов
  metadata: {
    testType: 'E2E',
    application: 'Inventory Management System',
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'test',
    browser: 'multi',
    platform: process.platform
  },

  // Настройки для CI/CD
  ...(process.env.CI && {
    // В CI используем только Chromium для скорости
    projects: [
      {
        name: 'ci-chromium',
        use: { 
          ...devices['Desktop Chrome'],
          launchOptions: {
            args: [
              '--disable-web-security',
              '--disable-dev-shm-usage',
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-gpu'
            ]
          }
        }
      }
    ],
    
    // Меньше воркеров в CI
    workers: 1,
    
    // Больше повторов в CI
    retries: 3,
    
    // Только критичные репортеры в CI
    reporter: [
      ['github'],
      ['junit', { outputFile: 'tests/reports/e2e-results.xml' }]
    ]
  })
}); 