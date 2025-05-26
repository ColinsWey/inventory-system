// Движок прогнозирования спроса
export interface SalesDataPoint {
  date: string;
  quantity: number;
  revenue: number;
  price: number;
  isWholesale: boolean;
  priceChangeDate?: string;
}

export interface SeasonalPattern {
  id: string;
  name: string;
  pattern: number[]; // 12 месяцев, коэффициенты от 0.1 до 3.0
  category?: string;
}

export interface ForecastResult {
  date: string;
  predicted: number;
  confidence: {
    lower: number;
    upper: number;
  };
  trend: 'up' | 'down' | 'stable';
  seasonalFactor: number;
  baselineDemand: number;
}

export interface DeliveryOption {
  type: 'air' | 'sea';
  minDays: number;
  maxDays: number;
  cost: number;
}

export interface StockAlert {
  level: 'green' | 'yellow' | 'red';
  message: string;
  daysLeft: number;
  recommendedAction: string;
  urgency: number; // 1-10
}

export interface OrderRecommendation {
  quantity: number;
  deliveryType: 'air' | 'sea';
  orderDate: string;
  expectedArrival: string;
  cost: number;
  reasoning: string;
}

class ForecastEngine {
  private seasonalTemplates: Map<string, SeasonalPattern> = new Map();
  private deliveryOptions: DeliveryOption[] = [
    { type: 'air', minDays: 14, maxDays: 21, cost: 1.5 },
    { type: 'sea', minDays: 65, maxDays: 80, cost: 1.0 }
  ];

  constructor() {
    this.initializeSeasonalTemplates();
  }

  private initializeSeasonalTemplates() {
    // Стандартные шаблоны сезонности
    const templates: SeasonalPattern[] = [
      {
        id: 'electronics',
        name: 'Электроника',
        pattern: [0.8, 0.7, 0.9, 1.0, 1.1, 1.0, 0.9, 0.8, 1.2, 1.3, 1.8, 2.2] // Пик в ноябре-декабре
      },
      {
        id: 'clothing',
        name: 'Одежда',
        pattern: [0.6, 0.7, 1.2, 1.4, 1.3, 1.0, 0.8, 0.9, 1.3, 1.4, 1.6, 1.2] // Весна и осень
      },
      {
        id: 'sports',
        name: 'Спорттовары',
        pattern: [0.7, 0.8, 1.2, 1.4, 1.6, 1.8, 1.5, 1.3, 1.1, 0.9, 0.7, 0.8] // Лето
      },
      {
        id: 'default',
        name: 'Стандартный',
        pattern: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0] // Без сезонности
      }
    ];

    templates.forEach(template => {
      this.seasonalTemplates.set(template.id, template);
    });
  }

  // Основной метод прогнозирования
  public generateForecast(
    salesData: SalesDataPoint[],
    currentStock: number,
    minStock: number,
    seasonalTemplateId: string = 'default',
    forecastDays: number = 90
  ): {
    forecast: ForecastResult[];
    alerts: StockAlert[];
    recommendations: OrderRecommendation[];
  } {
    // 1. Очистка данных от оптовых заказов
    const retailSales = this.filterRetailSales(salesData);
    
    // 2. Анализ базового спроса
    const baselineDemand = this.calculateBaselineDemand(retailSales);
    
    // 3. Анализ тренда
    const trendCoefficient = this.calculateTrend(retailSales);
    
    // 4. Корректировка на изменения цен
    const priceAdjustedDemand = this.adjustForPriceChanges(retailSales, baselineDemand);
    
    // 5. Применение сезонности
    const seasonalPattern = this.seasonalTemplates.get(seasonalTemplateId);
    
    // 6. Генерация прогноза
    const forecast = this.generateForecastPoints(
      priceAdjustedDemand,
      trendCoefficient,
      seasonalPattern,
      forecastDays
    );
    
    // 7. Анализ остатков и создание алертов
    const alerts = this.generateStockAlerts(forecast, currentStock, minStock);
    
    // 8. Рекомендации по заказу
    const recommendations = this.generateOrderRecommendations(
      forecast,
      currentStock,
      minStock,
      alerts
    );

    return { forecast, alerts, recommendations };
  }

  private filterRetailSales(salesData: SalesDataPoint[]): SalesDataPoint[] {
    // Исключаем оптовые заказы (обычно >10 единиц за раз или аномально большие)
    const avgQuantity = salesData.reduce((sum, point) => sum + point.quantity, 0) / salesData.length;
    const threshold = Math.max(10, avgQuantity * 3);
    
    return salesData.filter(point => !point.isWholesale && point.quantity <= threshold);
  }

  private calculateBaselineDemand(salesData: SalesDataPoint[]): number {
    if (salesData.length === 0) return 0;
    
    // Группируем по дням и считаем среднее
    const dailySales = new Map<string, number>();
    
    salesData.forEach(point => {
      const date = point.date.split('T')[0];
      dailySales.set(date, (dailySales.get(date) || 0) + point.quantity);
    });
    
    const dailyValues = Array.from(dailySales.values());
    
    // Используем медиану для устойчивости к выбросам
    dailyValues.sort((a, b) => a - b);
    const median = dailyValues[Math.floor(dailyValues.length / 2)];
    
    return median;
  }

  private calculateTrend(salesData: SalesDataPoint[]): number {
    if (salesData.length < 14) return 1.0; // Недостаточно данных
    
    // Группируем по неделям
    const weeklySales = new Map<string, number>();
    
    salesData.forEach(point => {
      const date = new Date(point.date);
      const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
      const weekKey = weekStart.toISOString().split('T')[0];
      
      weeklySales.set(weekKey, (weeklySales.get(weekKey) || 0) + point.quantity);
    });
    
    const weeks = Array.from(weeklySales.entries()).sort();
    if (weeks.length < 4) return 1.0;
    
    // Простая линейная регрессия для тренда
    const n = weeks.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    weeks.forEach(([week, sales], index) => {
      sumX += index;
      sumY += sales;
      sumXY += index * sales;
      sumX2 += index * index;
    });
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const avgY = sumY / n;
    
    // Конвертируем в коэффициент роста в неделю
    const weeklyGrowthRate = slope / avgY;
    
    // Ограничиваем разумными пределами
    return Math.max(0.5, Math.min(2.0, 1 + weeklyGrowthRate));
  }

  private adjustForPriceChanges(salesData: SalesDataPoint[], baselineDemand: number): number {
    // Анализируем эластичность спроса по цене
    const priceChanges = salesData.filter(point => point.priceChangeDate);
    
    if (priceChanges.length === 0) return baselineDemand;
    
    let totalElasticity = 0;
    let elasticityCount = 0;
    
    priceChanges.forEach(change => {
      const beforeDate = new Date(change.priceChangeDate!);
      beforeDate.setDate(beforeDate.getDate() - 7);
      
      const afterDate = new Date(change.priceChangeDate!);
      afterDate.setDate(afterDate.getDate() + 7);
      
      const beforeSales = salesData.filter(point => 
        new Date(point.date) >= beforeDate && 
        new Date(point.date) < new Date(change.priceChangeDate!)
      );
      
      const afterSales = salesData.filter(point => 
        new Date(point.date) >= new Date(change.priceChangeDate!) && 
        new Date(point.date) <= afterDate
      );
      
      if (beforeSales.length > 0 && afterSales.length > 0) {
        const avgBefore = beforeSales.reduce((sum, s) => sum + s.quantity, 0) / beforeSales.length;
        const avgAfter = afterSales.reduce((sum, s) => sum + s.quantity, 0) / afterSales.length;
        const priceBefore = beforeSales[0].price;
        const priceAfter = change.price;
        
        if (priceBefore !== priceAfter) {
          const quantityChange = (avgAfter - avgBefore) / avgBefore;
          const priceChange = (priceAfter - priceBefore) / priceBefore;
          const elasticity = quantityChange / priceChange;
          
          totalElasticity += elasticity;
          elasticityCount++;
        }
      }
    });
    
    if (elasticityCount === 0) return baselineDemand;
    
    const avgElasticity = totalElasticity / elasticityCount;
    
    // Применяем корректировку (обычно эластичность отрицательная)
    const currentPrice = salesData[salesData.length - 1]?.price || 0;
    const avgPrice = salesData.reduce((sum, s) => sum + s.price, 0) / salesData.length;
    
    if (avgPrice > 0) {
      const priceChangeRatio = currentPrice / avgPrice;
      const demandAdjustment = 1 + (avgElasticity * (priceChangeRatio - 1));
      return baselineDemand * Math.max(0.1, Math.min(3.0, demandAdjustment));
    }
    
    return baselineDemand;
  }

  private generateForecastPoints(
    baselineDemand: number,
    trendCoefficient: number,
    seasonalPattern: SeasonalPattern | undefined,
    forecastDays: number
  ): ForecastResult[] {
    const forecast: ForecastResult[] = [];
    const today = new Date();
    
    for (let i = 1; i <= forecastDays; i++) {
      const forecastDate = new Date(today);
      forecastDate.setDate(today.getDate() + i);
      
      // Применяем тренд
      const trendFactor = Math.pow(trendCoefficient, i / 7); // Тренд по неделям
      
      // Применяем сезонность
      const month = forecastDate.getMonth();
      const seasonalFactor = seasonalPattern?.pattern[month] || 1.0;
      
      // Базовый прогноз
      const predicted = baselineDemand * trendFactor * seasonalFactor;
      
      // Доверительный интервал (±20% базовый, увеличивается с расстоянием)
      const uncertainty = 0.2 + (i / forecastDays) * 0.3;
      const lower = predicted * (1 - uncertainty);
      const upper = predicted * (1 + uncertainty);
      
      // Определяем тренд
      const trend = trendCoefficient > 1.05 ? 'up' : 
                   trendCoefficient < 0.95 ? 'down' : 'stable';
      
      forecast.push({
        date: forecastDate.toISOString().split('T')[0],
        predicted: Math.max(0, predicted),
        confidence: {
          lower: Math.max(0, lower),
          upper: Math.max(0, upper)
        },
        trend,
        seasonalFactor,
        baselineDemand
      });
    }
    
    return forecast;
  }

  private generateStockAlerts(
    forecast: ForecastResult[],
    currentStock: number,
    minStock: number
  ): StockAlert[] {
    const alerts: StockAlert[] = [];
    let runningStock = currentStock;
    let stockoutDate: string | null = null;
    
    // Симулируем расход запасов
    for (const point of forecast) {
      runningStock -= point.predicted;
      
      if (runningStock <= 0 && !stockoutDate) {
        stockoutDate = point.date;
        break;
      }
    }
    
    if (stockoutDate) {
      const daysUntilStockout = Math.ceil(
        (new Date(stockoutDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysUntilStockout <= 30) {
        alerts.push({
          level: 'red',
          message: `Критический уровень запасов! Товар закончится через ${daysUntilStockout} дней`,
          daysLeft: daysUntilStockout,
          recommendedAction: 'Срочный заказ авиадоставкой',
          urgency: 10
        });
      } else if (daysUntilStockout <= 90) {
        alerts.push({
          level: 'yellow',
          message: `Низкий уровень запасов. Товар закончится через ${daysUntilStockout} дней`,
          daysLeft: daysUntilStockout,
          recommendedAction: 'Планировать заказ морской доставкой',
          urgency: 6
        });
      }
    }
    
    // Проверка минимального уровня
    if (currentStock <= minStock) {
      alerts.push({
        level: 'red',
        message: 'Достигнут минимальный уровень запасов',
        daysLeft: 0,
        recommendedAction: 'Немедленный заказ',
        urgency: 9
      });
    }
    
    return alerts.sort((a, b) => b.urgency - a.urgency);
  }

  private generateOrderRecommendations(
    forecast: ForecastResult[],
    currentStock: number,
    minStock: number,
    alerts: StockAlert[]
  ): OrderRecommendation[] {
    const recommendations: OrderRecommendation[] = [];
    
    // Рассчитываем потребность на 3 месяца
    const totalDemand90Days = forecast
      .slice(0, 90)
      .reduce((sum, point) => sum + point.predicted, 0);
    
    const safetyStock = minStock * 1.5; // 50% запас безопасности
    const targetStock = totalDemand90Days + safetyStock;
    const orderQuantity = Math.max(0, targetStock - currentStock);
    
    if (orderQuantity > 0) {
      // Рекомендация по авиадоставке (срочная)
      if (alerts.some(alert => alert.level === 'red')) {
        const airDelivery = this.deliveryOptions.find(d => d.type === 'air')!;
        const orderDate = new Date();
        const arrivalDate = new Date();
        arrivalDate.setDate(orderDate.getDate() + airDelivery.maxDays);
        
        recommendations.push({
          quantity: Math.ceil(orderQuantity * 0.3), // 30% срочным заказом
          deliveryType: 'air',
          orderDate: orderDate.toISOString().split('T')[0],
          expectedArrival: arrivalDate.toISOString().split('T')[0],
          cost: orderQuantity * 0.3 * airDelivery.cost,
          reasoning: 'Срочный заказ для предотвращения дефицита'
        });
      }
      
      // Рекомендация по морской доставке (основная)
      const seaDelivery = this.deliveryOptions.find(d => d.type === 'sea')!;
      const orderDate = new Date();
      const arrivalDate = new Date();
      arrivalDate.setDate(orderDate.getDate() + seaDelivery.maxDays);
      
      recommendations.push({
        quantity: Math.ceil(orderQuantity * 0.7), // 70% морской доставкой
        deliveryType: 'sea',
        orderDate: orderDate.toISOString().split('T')[0],
        expectedArrival: arrivalDate.toISOString().split('T')[0],
        cost: orderQuantity * 0.7 * seaDelivery.cost,
        reasoning: 'Основной заказ для пополнения запасов'
      });
    }
    
    return recommendations;
  }

  // Методы для управления шаблонами сезонности
  public addSeasonalTemplate(template: SeasonalPattern): void {
    this.seasonalTemplates.set(template.id, template);
  }

  public getSeasonalTemplates(): SeasonalPattern[] {
    return Array.from(this.seasonalTemplates.values());
  }

  public updateSeasonalTemplate(id: string, pattern: number[]): boolean {
    const template = this.seasonalTemplates.get(id);
    if (template) {
      template.pattern = pattern;
      return true;
    }
    return false;
  }
}

export default ForecastEngine; 