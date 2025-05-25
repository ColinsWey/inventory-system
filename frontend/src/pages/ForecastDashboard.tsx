import React, { useState, useEffect, useMemo } from 'react';
import {
  ChartBarIcon,
  CogIcon,
  BellIcon,
  ShoppingCartIcon,
  CalendarIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import {
  SeasonalityTemplates,
  SalesChart,
  StockAlerts,
  OrderRecommendations,
  ForecastEngine,
  SalesDataPoint,
  SeasonalPattern,
  ForecastResult,
  StockAlert,
  OrderRecommendation
} from '../components/forecast';
import { Product } from '../types';
import { cn } from '../utils';
import Button from '../components/ui/Button';
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/Card';

interface ForecastDashboardProps {
  productId?: string;
}

const ForecastDashboard: React.FC<ForecastDashboardProps> = ({ productId }) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSeasonalTemplate, setSelectedSeasonalTemplate] = useState<string>('electronics');
  const [forecastPeriod, setForecastPeriod] = useState<number>(90);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Инициализация движка прогнозирования
  const [forecastEngine] = useState(() => new ForecastEngine());
  const [seasonalTemplates, setSeasonalTemplates] = useState<SeasonalPattern[]>([]);

  // Состояние данных
  const [salesData, setSalesData] = useState<SalesDataPoint[]>([]);
  const [forecastData, setForecastData] = useState<ForecastResult[]>([]);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [recommendations, setRecommendations] = useState<OrderRecommendation[]>([]);

  // Демо данные для товара
  const demoProduct: Product = {
    id: '1',
    name: 'iPhone 15 Pro',
    sku: 'IPH15PRO',
    description: 'Флагманский смартфон Apple с чипом A17 Pro',
    category: { id: '1', name: 'Смартфоны', created_at: '', updated_at: '' },
    unit_price: 89990,
    cost_price: 65000,
    unit_of_measure: 'шт',
    min_stock_level: 10,
    max_stock_level: 100,
    current_stock: 25,
    status: 'active',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-20T15:30:00Z'
  };

  // Генерация демо данных продаж
  const generateDemoSalesData = (): SalesDataPoint[] => {
    const data: SalesDataPoint[] = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);

    for (let i = 0; i < 90; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      // Базовый спрос с сезонностью
      const month = date.getMonth();
      const seasonalFactor = [0.8, 0.7, 0.9, 1.0, 1.1, 1.0, 0.9, 0.8, 1.2, 1.3, 1.8, 2.2][month];
      
      // Случайные колебания
      const randomFactor = 0.7 + Math.random() * 0.6;
      const baseQuantity = 3 * seasonalFactor * randomFactor;
      
      // Иногда добавляем оптовые заказы
      const isWholesale = Math.random() < 0.05;
      const quantity = isWholesale ? Math.floor(baseQuantity * 5) : Math.floor(baseQuantity);
      
      // Изменения цен
      const priceChangeDate = i === 30 || i === 60 ? date.toISOString() : undefined;
      const basePrice = 89990;
      const priceMultiplier = i < 30 ? 1.0 : i < 60 ? 0.95 : 1.05;
      const price = basePrice * priceMultiplier;

      data.push({
        date: date.toISOString(),
        quantity,
        revenue: quantity * price,
        price,
        isWholesale,
        priceChangeDate
      });
    }

    return data;
  };

  // Изменения цен для графика
  const priceChanges = [
    {
      date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      oldPrice: 89990,
      newPrice: 85490,
      reason: 'Акция'
    },
    {
      date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      oldPrice: 85490,
      newPrice: 94490,
      reason: 'Повышение курса'
    }
  ];

  // Инициализация данных
  useEffect(() => {
    setSelectedProduct(demoProduct);
    setSeasonalTemplates(forecastEngine.getSeasonalTemplates());
    setSalesData(generateDemoSalesData());
  }, []);

  // Генерация прогноза при изменении параметров
  useEffect(() => {
    if (salesData.length > 0 && selectedProduct) {
      setIsLoading(true);
      
      // Симуляция задержки для демонстрации загрузки
      setTimeout(() => {
        const result = forecastEngine.generateForecast(
          salesData,
          selectedProduct.current_stock,
          selectedProduct.min_stock_level || 0,
          selectedSeasonalTemplate,
          forecastPeriod
        );

        setForecastData(result.forecast);
        setAlerts(result.alerts);
        setRecommendations(result.recommendations);
        setLastUpdated(new Date());
        setIsLoading(false);
      }, 1000);
    }
  }, [salesData, selectedProduct, selectedSeasonalTemplate, forecastPeriod]);

  // Обработчики событий
  const handleSeasonalTemplateSelect = (templateId: string) => {
    setSelectedSeasonalTemplate(templateId);
  };

  const handleSeasonalTemplateAdd = (template: SeasonalPattern) => {
    forecastEngine.addSeasonalTemplate(template);
    setSeasonalTemplates(forecastEngine.getSeasonalTemplates());
  };

  const handleSeasonalTemplateUpdate = (templateId: string, pattern: number[]) => {
    forecastEngine.updateSeasonalTemplate(templateId, pattern);
    setSeasonalTemplates(forecastEngine.getSeasonalTemplates());
  };

  const handleSeasonalTemplateDelete = (templateId: string) => {
    // Удаление шаблона (в реальном приложении)
    console.log('Удаление шаблона:', templateId);
  };

  const handleCreateOrder = (recommendation: OrderRecommendation) => {
    console.log('Создание заказа:', recommendation);
    // Здесь будет интеграция с системой заказов
  };

  const handleTakeAction = (alert: StockAlert) => {
    console.log('Принятие мер по алерту:', alert);
    // Здесь будет логика обработки алертов
  };

  const refreshForecast = () => {
    setSalesData(generateDemoSalesData());
  };

  // Статистика для дашборда
  const dashboardStats = useMemo(() => {
    if (!selectedProduct || forecastData.length === 0) return null;

    const totalForecast = forecastData.reduce((sum, point) => sum + point.predicted, 0);
    const avgDailyDemand = totalForecast / forecastData.length;
    const daysUntilStockout = selectedProduct.current_stock / avgDailyDemand;
    const criticalAlerts = alerts.filter(a => a.level === 'red').length;

    return {
      totalForecast: Math.round(totalForecast),
      avgDailyDemand: Math.round(avgDailyDemand * 10) / 10,
      daysUntilStockout: Math.round(daysUntilStockout),
      criticalAlerts
    };
  }, [selectedProduct, forecastData, alerts]);

  return (
    <div className="space-y-6 p-6">
      {/* Заголовок дашборда */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Прогнозирование спроса
          </h1>
          <p className="text-gray-600 mt-1">
            Анализ продаж и планирование закупок на основе данных
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-sm text-gray-500">
            Обновлено: {lastUpdated.toLocaleTimeString('ru-RU')}
          </div>
          <Button
            onClick={refreshForecast}
            leftIcon={<ArrowPathIcon className="h-4 w-4" />}
            disabled={isLoading}
          >
            Обновить
          </Button>
        </div>
      </div>

      {/* Информация о товаре */}
      {selectedProduct && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
                  <span className="text-2xl font-bold text-blue-600">
                    {selectedProduct.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <CardTitle className="text-xl">{selectedProduct.name}</CardTitle>
                  <p className="text-gray-500">{selectedProduct.sku} • {selectedProduct.category?.name}</p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <select
                  value={selectedSeasonalTemplate}
                  onChange={(e) => handleSeasonalTemplateSelect(e.target.value)}
                  className="text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {seasonalTemplates.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>

                <select
                  value={forecastPeriod}
                  onChange={(e) => setForecastPeriod(Number(e.target.value))}
                  className="text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={30}>30 дней</option>
                  <option value={60}>60 дней</option>
                  <option value={90}>90 дней</option>
                  <option value={180}>180 дней</option>
                </select>
              </div>
            </div>
          </CardHeader>

          {dashboardStats && (
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-900">Текущий остаток</p>
                      <p className="text-2xl font-bold text-blue-600">{selectedProduct.current_stock}</p>
                    </div>
                    <ChartBarIcon className="h-8 w-8 text-blue-500" />
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-900">Прогноз ({forecastPeriod}д)</p>
                      <p className="text-2xl font-bold text-green-600">{dashboardStats.totalForecast}</p>
                    </div>
                    <CalendarIcon className="h-8 w-8 text-green-500" />
                  </div>
                </div>

                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-900">Дней до исчерпания</p>
                      <p className="text-2xl font-bold text-orange-600">{dashboardStats.daysUntilStockout}</p>
                    </div>
                    <CalendarIcon className="h-8 w-8 text-orange-500" />
                  </div>
                </div>

                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-red-900">Критические алерты</p>
                      <p className="text-2xl font-bold text-red-600">{dashboardStats.criticalAlerts}</p>
                    </div>
                    <BellIcon className="h-8 w-8 text-red-500" />
                  </div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Основной контент */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Левая колонка - График продаж */}
        <div className="xl:col-span-2 space-y-6">
          <SalesChart
            salesData={salesData}
            forecastData={forecastData}
            priceChanges={priceChanges}
            title="Анализ продаж и прогноз"
            period="day"
            showForecast={true}
            showPriceChanges={true}
            showConfidenceInterval={true}
            height={500}
          />

          {/* Рекомендации по заказу */}
          <OrderRecommendations
            recommendations={recommendations}
            currentStock={selectedProduct?.current_stock || 0}
            minStock={selectedProduct?.min_stock_level || 0}
            productName={selectedProduct?.name}
            onCreateOrder={handleCreateOrder}
          />
        </div>

        {/* Правая колонка - Алерты и шаблоны */}
        <div className="space-y-6">
          {/* Алерты */}
          <StockAlerts
            alerts={alerts}
            onTakeAction={handleTakeAction}
          />

          {/* Шаблоны сезонности */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <CogIcon className="h-5 w-5 text-gray-600" />
                <CardTitle className="text-base">Настройка сезонности</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <SeasonalityTemplates
                templates={seasonalTemplates}
                selectedTemplateId={selectedSeasonalTemplate}
                onSelect={handleSeasonalTemplateSelect}
                onAdd={handleSeasonalTemplateAdd}
                onUpdate={handleSeasonalTemplateUpdate}
                onDelete={handleSeasonalTemplateDelete}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Индикатор загрузки */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-900">Обновление прогноза...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForecastDashboard; 