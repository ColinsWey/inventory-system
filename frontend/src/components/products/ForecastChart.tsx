import React, { useState, useMemo } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { cn, formatNumber, formatCurrency } from '../../utils';
import Button from '../ui/Button';

// Регистрируем компоненты Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ForecastData {
  date: string;
  actual?: number;
  predicted: number;
  confidence: {
    lower: number;
    upper: number;
  };
  trend: 'up' | 'down' | 'stable';
}

interface ForecastChartProps {
  data: ForecastData[];
  title?: string;
  productName?: string;
  period?: '7d' | '30d' | '90d' | '1y';
  onPeriodChange?: (period: '7d' | '30d' | '90d' | '1y') => void;
  chartType?: 'line' | 'bar';
  showConfidence?: boolean;
  showTrend?: boolean;
  className?: string;
}

const ForecastChart: React.FC<ForecastChartProps> = ({
  data,
  title = 'Прогноз продаж',
  productName,
  period = '30d',
  onPeriodChange,
  chartType = 'line',
  showConfidence = true,
  showTrend = true,
  className
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState(period);
  const [selectedChartType, setSelectedChartType] = useState(chartType);

  // Обработка данных для графика
  const chartData = useMemo(() => {
    const labels = data.map(item => {
      const date = new Date(item.date);
      return date.toLocaleDateString('ru-RU', { 
        month: 'short', 
        day: 'numeric' 
      });
    });

    const datasets = [];

    // Фактические данные
    if (data.some(item => item.actual !== undefined)) {
      datasets.push({
        label: 'Фактические продажи',
        data: data.map(item => item.actual || null),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: false,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2,
      });
    }

    // Прогнозируемые данные
    datasets.push({
      label: 'Прогноз',
      data: data.map(item => item.predicted),
      borderColor: 'rgb(16, 185, 129)',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      fill: false,
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6,
      borderWidth: 2,
      borderDash: data.some(item => item.actual !== undefined) ? [5, 5] : undefined,
    });

    // Доверительный интервал
    if (showConfidence) {
      datasets.push({
        label: 'Верхняя граница',
        data: data.map(item => item.confidence.upper),
        borderColor: 'rgba(16, 185, 129, 0.3)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: '+1',
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 1,
        borderDash: [2, 2],
      });

      datasets.push({
        label: 'Нижняя граница',
        data: data.map(item => item.confidence.lower),
        borderColor: 'rgba(16, 185, 129, 0.3)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 1,
        borderDash: [2, 2],
      });
    }

    return { labels, datasets };
  }, [data, showConfidence]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12
          },
          filter: (legendItem: any) => {
            // Скрываем границы доверительного интервала из легенды
            return !legendItem.text.includes('граница');
          }
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        callbacks: {
          label: function(context: any) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            if (label.includes('граница')) return null;
            return `${label}: ${formatNumber(value)}`;
          },
          afterBody: function(tooltipItems: any[]) {
            const dataIndex = tooltipItems[0]?.dataIndex;
            if (dataIndex !== undefined && data[dataIndex]) {
              const item = data[dataIndex];
              return [
                `Доверительный интервал:`,
                `${formatNumber(item.confidence.lower)} - ${formatNumber(item.confidence.upper)}`
              ];
            }
            return [];
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 11
          }
        }
      },
      y: {
        display: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          font: {
            size: 11
          },
          callback: function(value: any) {
            return formatNumber(value);
          }
        }
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    }
  };

  // Статистика прогноза
  const forecastStats = useMemo(() => {
    if (data.length === 0) return null;

    const totalPredicted = data.reduce((sum, item) => sum + item.predicted, 0);
    const avgPredicted = totalPredicted / data.length;
    
    const actualData = data.filter(item => item.actual !== undefined);
    const totalActual = actualData.reduce((sum, item) => sum + (item.actual || 0), 0);
    const avgActual = actualData.length > 0 ? totalActual / actualData.length : 0;
    
    const accuracy = actualData.length > 0 
      ? Math.max(0, 100 - Math.abs((avgActual - avgPredicted) / avgActual * 100))
      : null;

    const trend = data.length > 1 
      ? data[data.length - 1].predicted > data[0].predicted ? 'up' : 'down'
      : 'stable';

    const trendPercentage = data.length > 1
      ? ((data[data.length - 1].predicted - data[0].predicted) / data[0].predicted * 100)
      : 0;

    return {
      totalPredicted,
      avgPredicted,
      accuracy,
      trend,
      trendPercentage
    };
  }, [data]);

  const periodOptions = [
    { value: '7d', label: '7 дней' },
    { value: '30d', label: '30 дней' },
    { value: '90d', label: '90 дней' },
    { value: '1y', label: '1 год' }
  ];

  const handlePeriodChange = (newPeriod: '7d' | '30d' | '90d' | '1y') => {
    setSelectedPeriod(newPeriod);
    onPeriodChange?.(newPeriod);
  };

  return (
    <div className={cn("bg-white rounded-lg border border-gray-200 shadow-sm", className)}>
      {/* Заголовок */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {productName && (
              <p className="text-sm text-gray-500 mt-1">{productName}</p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* Переключатель типа графика */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setSelectedChartType('line')}
                className={cn(
                  "p-2 rounded-md transition-colors",
                  selectedChartType === 'line' 
                    ? "bg-white shadow-sm text-gray-900" 
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                <ArrowTrendingUpIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setSelectedChartType('bar')}
                className={cn(
                  "p-2 rounded-md transition-colors",
                  selectedChartType === 'bar' 
                    ? "bg-white shadow-sm text-gray-900" 
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                <ChartBarIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Выбор периода */}
            <select
              value={selectedPeriod}
              onChange={(e) => handlePeriodChange(e.target.value as any)}
              className="text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {periodOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Статистика */}
        {forecastStats && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Прогноз (среднее)</span>
                <InformationCircleIcon className="h-4 w-4 text-gray-400" />
              </div>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {formatNumber(forecastStats.avgPredicted)}
              </p>
            </div>

            {forecastStats.accuracy !== null && (
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Точность</span>
                  <InformationCircleIcon className="h-4 w-4 text-gray-400" />
                </div>
                <p className={cn(
                  "text-lg font-semibold mt-1",
                  forecastStats.accuracy > 80 ? "text-green-600" :
                  forecastStats.accuracy > 60 ? "text-yellow-600" : "text-red-600"
                )}>
                  {forecastStats.accuracy.toFixed(1)}%
                </p>
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Тренд</span>
                {forecastStats.trend === 'up' ? (
                  <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />
                ) : (
                  <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />
                )}
              </div>
              <p className={cn(
                "text-lg font-semibold mt-1",
                forecastStats.trend === 'up' ? "text-green-600" : "text-red-600"
              )}>
                {forecastStats.trendPercentage > 0 ? '+' : ''}{forecastStats.trendPercentage.toFixed(1)}%
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Общий прогноз</span>
                <CalendarIcon className="h-4 w-4 text-gray-400" />
              </div>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {formatNumber(forecastStats.totalPredicted)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* График */}
      <div className="p-6">
        <div className="h-80">
          {selectedChartType === 'line' ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            <Bar data={chartData} options={chartOptions} />
          )}
        </div>
      </div>

      {/* Предупреждения и рекомендации */}
      {showTrend && forecastStats && (
        <div className="px-6 pb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <InformationCircleIcon className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-900">
                  Анализ прогноза
                </h4>
                <div className="mt-2 text-sm text-blue-700">
                  {forecastStats.trend === 'up' ? (
                    <p>
                      Прогнозируется рост продаж на {Math.abs(forecastStats.trendPercentage).toFixed(1)}%. 
                      Рекомендуется увеличить запасы для удовлетворения спроса.
                    </p>
                  ) : (
                    <p>
                      Прогнозируется снижение продаж на {Math.abs(forecastStats.trendPercentage).toFixed(1)}%. 
                      Рекомендуется пересмотреть стратегию закупок.
                    </p>
                  )}
                  
                  {forecastStats.accuracy !== null && forecastStats.accuracy < 70 && (
                    <p className="mt-2 text-yellow-700">
                      ⚠️ Низкая точность прогноза ({forecastStats.accuracy.toFixed(1)}%). 
                      Рекомендуется собрать больше данных для улучшения модели.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Компонент мини-графика для карточек
interface MiniChartProps {
  data: number[];
  trend: 'up' | 'down' | 'stable';
  height?: number;
  className?: string;
}

export const MiniChart: React.FC<MiniChartProps> = ({
  data,
  trend,
  height = 40,
  className
}) => {
  const chartData = {
    labels: data.map((_, i) => i.toString()),
    datasets: [{
      data,
      borderColor: trend === 'up' ? 'rgb(16, 185, 129)' : 
                   trend === 'down' ? 'rgb(239, 68, 68)' : 'rgb(107, 114, 128)',
      backgroundColor: trend === 'up' ? 'rgba(16, 185, 129, 0.1)' : 
                       trend === 'down' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(107, 114, 128, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 0,
      borderWidth: 2,
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false }
    },
    scales: {
      x: { display: false },
      y: { display: false }
    },
    elements: {
      point: { radius: 0 }
    }
  };

  return (
    <div className={cn("", className)} style={{ height }}>
      <Line data={chartData} options={options} />
    </div>
  );
};

export default ForecastChart; 