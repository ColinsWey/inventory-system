/**
 * E2E тесты для системы прогнозирования спроса
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Прогнозирование спроса', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Авторизация перед каждым тестом
    await page.goto('/');
    await page.fill('[data-testid="username-input"]', 'admin');
    await page.fill('[data-testid="password-input"]', 'admin');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/dashboard');
    
    // Переходим на страницу прогнозирования
    await page.click('[data-testid="nav-forecast"]');
    await expect(page).toHaveURL('/forecast');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('Расчет базового прогноза для товара', async () => {
    // Given: страница прогнозирования загружена
    await expect(page.locator('[data-testid="forecast-page-title"]')).toContainText('Прогнозирование спроса');
    
    // When: выбираем товар для прогнозирования
    await page.click('[data-testid="product-selector"]');
    await page.click('[data-testid="product-option-iphone15pro"]');
    
    // Устанавливаем период прогнозирования
    await page.fill('[data-testid="forecast-days-input"]', '30');
    
    // Запускаем расчет прогноза
    await page.click('[data-testid="calculate-forecast-button"]');
    
    // Then: должен отобразиться прогноз
    await expect(page.locator('[data-testid="forecast-results"]')).toBeVisible();
    await expect(page.locator('[data-testid="forecast-chart"]')).toBeVisible();
    
    // Проверяем наличие ключевых элементов прогноза
    await expect(page.locator('[data-testid="forecast-summary"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-demand"]')).toContainText(/\d+/);
    await expect(page.locator('[data-testid="avg-daily-demand"]')).toContainText(/\d+/);
    await expect(page.locator('[data-testid="confidence-level"]')).toContainText('95%');
  });

  test('Применение сезонности к прогнозу', async () => {
    // Given: выбран товар с сезонностью
    await page.click('[data-testid="product-selector"]');
    await page.click('[data-testid="product-option-winter-jacket"]');
    
    // When: включаем применение сезонности
    await page.check('[data-testid="apply-seasonality-checkbox"]');
    
    // Выбираем шаблон сезонности
    await page.click('[data-testid="seasonality-template-selector"]');
    await page.click('[data-testid="template-clothing"]');
    
    // Запускаем расчет
    await page.click('[data-testid="calculate-forecast-button"]');
    
    // Then: прогноз должен учитывать сезонность
    await expect(page.locator('[data-testid="seasonality-applied-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="seasonality-applied-indicator"]')).toContainText('Сезонность применена');
    
    // Проверяем, что график показывает сезонные колебания
    await expect(page.locator('[data-testid="forecast-chart"]')).toBeVisible();
    
    // Проверяем детали сезонности
    await page.click('[data-testid="seasonality-details-button"]');
    await expect(page.locator('[data-testid="seasonality-coefficients"]')).toBeVisible();
  });

  test('Исключение оптовых заказов из прогноза', async () => {
    // Given: товар с историей оптовых заказов
    await page.click('[data-testid="product-selector"]');
    await page.click('[data-testid="product-option-macbook"]');
    
    // When: включаем исключение оптовых заказов
    await page.check('[data-testid="exclude-wholesale-checkbox"]');
    
    // Запускаем расчет прогноза
    await page.click('[data-testid="calculate-forecast-button"]');
    
    // Then: должно быть указано, что оптовые заказы исключены
    await expect(page.locator('[data-testid="wholesale-excluded-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="wholesale-excluded-indicator"]')).toContainText('Оптовые заказы исключены');
    
    // Проверяем статистику исключенных заказов
    await page.click('[data-testid="wholesale-details-button"]');
    await expect(page.locator('[data-testid="excluded-orders-count"]')).toContainText(/\d+ заказов исключено/);
  });

  test('Корректировка прогноза на изменение цены', async () => {
    // Given: базовый прогноз рассчитан
    await page.click('[data-testid="product-selector"]');
    await page.click('[data-testid="product-option-iphone15pro"]');
    await page.click('[data-testid="calculate-forecast-button"]');
    
    await expect(page.locator('[data-testid="forecast-results"]')).toBeVisible();
    
    // When: включаем корректировку на изменение цены
    await page.check('[data-testid="price-adjustment-checkbox"]');
    
    // Вводим новую цену (увеличение на 10%)
    const currentPrice = await page.locator('[data-testid="current-price"]').textContent();
    const newPrice = Math.round(parseFloat(currentPrice!.replace(/[^\d]/g, '')) * 1.1);
    await page.fill('[data-testid="new-price-input"]', newPrice.toString());
    
    // Устанавливаем эластичность спроса
    await page.fill('[data-testid="price-elasticity-input"]', '-0.5');
    
    // Пересчитываем прогноз
    await page.click('[data-testid="recalculate-forecast-button"]');
    
    // Then: прогноз должен быть скорректирован
    await expect(page.locator('[data-testid="price-adjustment-applied"]')).toBeVisible();
    await expect(page.locator('[data-testid="price-impact-summary"]')).toContainText(/Снижение спроса на \d+%/);
  });

  test('Настройка доверительных интервалов', async () => {
    // Given: страница прогнозирования
    await page.click('[data-testid="product-selector"]');
    await page.click('[data-testid="product-option-airpods"]');
    
    // When: изменяем уровень доверия
    await page.click('[data-testid="confidence-level-selector"]');
    await page.click('[data-testid="confidence-90"]');
    
    // Запускаем расчет
    await page.click('[data-testid="calculate-forecast-button"]');
    
    // Then: доверительные интервалы должны отображаться
    await expect(page.locator('[data-testid="confidence-intervals"]')).toBeVisible();
    await expect(page.locator('[data-testid="confidence-level-display"]')).toContainText('90%');
    
    // Проверяем отображение интервалов на графике
    await expect(page.locator('[data-testid="confidence-band"]')).toBeVisible();
    
    // Проверяем численные значения интервалов
    await expect(page.locator('[data-testid="lower-bound"]')).toBeVisible();
    await expect(page.locator('[data-testid="upper-bound"]')).toBeVisible();
  });

  test('Прогнозирование с учетом промо-акций', async () => {
    // Given: товар выбран
    await page.click('[data-testid="product-selector"]');
    await page.click('[data-testid="product-option-samsung-galaxy"]');
    
    // When: добавляем промо-акцию
    await page.click('[data-testid="add-promotion-button"]');
    
    // Заполняем данные промо-акции
    await page.fill('[data-testid="promotion-start-date"]', '2024-12-20');
    await page.fill('[data-testid="promotion-end-date"]', '2024-12-25');
    await page.fill('[data-testid="promotion-discount"]', '20');
    await page.fill('[data-testid="promotion-uplift"]', '1.5');
    
    await page.click('[data-testid="save-promotion-button"]');
    
    // Запускаем прогноз с промо-акцией
    await page.click('[data-testid="calculate-forecast-button"]');
    
    // Then: промо-акция должна быть учтена в прогнозе
    await expect(page.locator('[data-testid="promotion-applied-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="promotion-period-highlight"]')).toBeVisible();
    
    // Проверяем увеличение спроса в период промо-акции
    await page.hover('[data-testid="promotion-period-highlight"]');
    await expect(page.locator('[data-testid="promotion-tooltip"]')).toContainText('Промо-акция: +50%');
  });

  test('Сравнение нескольких сценариев прогноза', async () => {
    // Given: базовый прогноз создан
    await page.click('[data-testid="product-selector"]');
    await page.click('[data-testid="product-option-tablet"]');
    await page.click('[data-testid="calculate-forecast-button"]');
    
    await expect(page.locator('[data-testid="forecast-results"]')).toBeVisible();
    
    // When: создаем второй сценарий
    await page.click('[data-testid="create-scenario-button"]');
    await page.fill('[data-testid="scenario-name"]', 'Сценарий с промо-акцией');
    
    // Добавляем промо-акцию во второй сценарий
    await page.click('[data-testid="add-promotion-button"]');
    await page.fill('[data-testid="promotion-start-date"]', '2024-11-24');
    await page.fill('[data-testid="promotion-end-date"]', '2024-11-27');
    await page.fill('[data-testid="promotion-discount"]', '30');
    await page.click('[data-testid="save-promotion-button"]');
    
    await page.click('[data-testid="calculate-scenario-button"]');
    
    // Then: должно быть доступно сравнение сценариев
    await expect(page.locator('[data-testid="scenario-comparison"]')).toBeVisible();
    await expect(page.locator('[data-testid="scenario-1-label"]')).toContainText('Базовый сценарий');
    await expect(page.locator('[data-testid="scenario-2-label"]')).toContainText('Сценарий с промо-акцией');
    
    // Проверяем различия в прогнозах
    await expect(page.locator('[data-testid="scenario-difference"]')).toBeVisible();
  });

  test('Экспорт результатов прогнозирования', async () => {
    // Given: прогноз рассчитан
    await page.click('[data-testid="product-selector"]');
    await page.click('[data-testid="product-option-headphones"]');
    await page.click('[data-testid="calculate-forecast-button"]');
    
    await expect(page.locator('[data-testid="forecast-results"]')).toBeVisible();
    
    // When: экспортируем в Excel
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-excel-button"]');
    const download = await downloadPromise;
    
    // Then: файл должен быть скачан
    expect(download.suggestedFilename()).toMatch(/forecast_.*\.xlsx$/);
    
    // When: экспортируем график в PDF
    const pdfDownloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-pdf-button"]');
    const pdfDownload = await pdfDownloadPromise;
    
    // Then: PDF файл должен быть скачан
    expect(pdfDownload.suggestedFilename()).toMatch(/forecast_chart_.*\.pdf$/);
  });

  test('Сохранение и загрузка настроек прогнозирования', async () => {
    // Given: настроены параметры прогнозирования
    await page.click('[data-testid="product-selector"]');
    await page.click('[data-testid="product-option-vacuum"]');
    
    await page.fill('[data-testid="forecast-days-input"]', '60');
    await page.check('[data-testid="apply-seasonality-checkbox"]');
    await page.check('[data-testid="exclude-wholesale-checkbox"]');
    
    // When: сохраняем настройки как шаблон
    await page.click('[data-testid="save-template-button"]');
    await page.fill('[data-testid="template-name"]', 'Стандартный прогноз на 60 дней');
    await page.click('[data-testid="confirm-save-template"]');
    
    // Then: шаблон должен быть сохранен
    await expect(page.locator('[data-testid="template-saved-message"]')).toContainText('Шаблон сохранен');
    
    // When: загружаем сохраненный шаблон
    await page.reload();
    await page.click('[data-testid="load-template-button"]');
    await page.click('[data-testid="template-standard-60-days"]');
    
    // Then: настройки должны быть восстановлены
    await expect(page.locator('[data-testid="forecast-days-input"]')).toHaveValue('60');
    await expect(page.locator('[data-testid="apply-seasonality-checkbox"]')).toBeChecked();
    await expect(page.locator('[data-testid="exclude-wholesale-checkbox"]')).toBeChecked();
  });

  test('Валидация входных данных для прогнозирования', async () => {
    // Given: страница прогнозирования
    
    // When: пытаемся рассчитать прогноз без выбора товара
    await page.click('[data-testid="calculate-forecast-button"]');
    
    // Then: должно появиться сообщение об ошибке
    await expect(page.locator('[data-testid="validation-error"]')).toContainText('Выберите товар для прогнозирования');
    
    // When: выбираем товар, но указываем некорректный период
    await page.click('[data-testid="product-selector"]');
    await page.click('[data-testid="product-option-iphone15pro"]');
    await page.fill('[data-testid="forecast-days-input"]', '0');
    await page.click('[data-testid="calculate-forecast-button"]');
    
    // Then: должна быть ошибка валидации периода
    await expect(page.locator('[data-testid="validation-error"]')).toContainText('Период прогнозирования должен быть больше 0');
    
    // When: указываем слишком большой период
    await page.fill('[data-testid="forecast-days-input"]', '1000');
    await page.click('[data-testid="calculate-forecast-button"]');
    
    // Then: должно быть предупреждение о большом периоде
    await expect(page.locator('[data-testid="validation-warning"]')).toContainText('Прогноз на период более 365 дней может быть неточным');
  });

  test('Отображение метрик точности прогноза', async () => {
    // Given: товар с достаточной историей продаж
    await page.click('[data-testid="product-selector"]');
    await page.click('[data-testid="product-option-tshirt"]');
    
    // When: рассчитываем прогноз
    await page.click('[data-testid="calculate-forecast-button"]');
    
    await expect(page.locator('[data-testid="forecast-results"]')).toBeVisible();
    
    // Then: должны отображаться метрики точности
    await page.click('[data-testid="accuracy-metrics-tab"]');
    
    await expect(page.locator('[data-testid="mae-metric"]')).toBeVisible();
    await expect(page.locator('[data-testid="mape-metric"]')).toBeVisible();
    await expect(page.locator('[data-testid="rmse-metric"]')).toBeVisible();
    
    // Проверяем, что метрики имеют разумные значения
    const mapeValue = await page.locator('[data-testid="mape-value"]').textContent();
    expect(parseFloat(mapeValue!.replace('%', ''))).toBeLessThan(100);
  });

  test('Рекомендации по заказу товара', async () => {
    // Given: прогноз рассчитан
    await page.click('[data-testid="product-selector"]');
    await page.click('[data-testid="product-option-microwave"]');
    await page.click('[data-testid="calculate-forecast-button"]');
    
    await expect(page.locator('[data-testid="forecast-results"]')).toBeVisible();
    
    // When: переходим к рекомендациям по заказу
    await page.click('[data-testid="order-recommendations-tab"]');
    
    // Then: должны отображаться рекомендации
    await expect(page.locator('[data-testid="recommended-order-quantity"]')).toBeVisible();
    await expect(page.locator('[data-testid="reorder-point"]')).toBeVisible();
    await expect(page.locator('[data-testid="safety-stock"]')).toBeVisible();
    
    // Проверяем обоснование рекомендаций
    await page.click('[data-testid="recommendation-details"]');
    await expect(page.locator('[data-testid="calculation-explanation"]')).toBeVisible();
    
    // Проверяем возможность корректировки уровня сервиса
    await page.fill('[data-testid="service-level-input"]', '99');
    await page.click('[data-testid="recalculate-recommendations"]');
    
    // Рекомендации должны обновиться
    await expect(page.locator('[data-testid="recommendations-updated"]')).toBeVisible();
  });

  test('Мобильная адаптивность страницы прогнозирования', async ({ browser }) => {
    // Given: мобильное устройство
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 667 }
    });
    const mobilePage = await mobileContext.newPage();
    
    // Авторизация на мобильном
    await mobilePage.goto('/');
    await mobilePage.fill('[data-testid="username-input"]', 'admin');
    await mobilePage.fill('[data-testid="password-input"]', 'admin');
    await mobilePage.click('[data-testid="login-button"]');
    
    await mobilePage.goto('/forecast');
    
    // When: проверяем адаптивность элементов
    
    // Then: элементы должны корректно отображаться на мобильном
    await expect(mobilePage.locator('[data-testid="product-selector"]')).toBeVisible();
    await expect(mobilePage.locator('[data-testid="forecast-days-input"]')).toBeVisible();
    await expect(mobilePage.locator('[data-testid="calculate-forecast-button"]')).toBeVisible();
    
    // Проверяем, что график адаптируется под мобильный экран
    await mobilePage.click('[data-testid="product-selector"]');
    await mobilePage.click('[data-testid="product-option-iphone15pro"]');
    await mobilePage.click('[data-testid="calculate-forecast-button"]');
    
    await expect(mobilePage.locator('[data-testid="forecast-chart"]')).toBeVisible();
    
    // График должен быть адаптирован под мобильный экран
    const chartBox = await mobilePage.locator('[data-testid="forecast-chart"]').boundingBox();
    expect(chartBox?.width).toBeLessThanOrEqual(375);
    
    await mobileContext.close();
  });

  test('Производительность расчета прогноза', async () => {
    // Given: товар с большой историей продаж
    await page.click('[data-testid="product-selector"]');
    await page.click('[data-testid="product-option-football-ball"]');
    
    // When: засекаем время расчета прогноза
    const startTime = Date.now();
    await page.click('[data-testid="calculate-forecast-button"]');
    
    // Ждем появления результатов
    await expect(page.locator('[data-testid="forecast-results"]')).toBeVisible();
    const endTime = Date.now();
    
    // Then: расчет должен завершиться в разумное время
    const calculationTime = endTime - startTime;
    expect(calculationTime).toBeLessThan(10000); // Менее 10 секунд
    
    // Проверяем индикатор загрузки
    await page.click('[data-testid="calculate-forecast-button"]');
    await expect(page.locator('[data-testid="calculation-spinner"]')).toBeVisible();
  });
}); 