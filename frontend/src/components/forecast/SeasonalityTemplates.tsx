import React, { useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  ChartBarIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { SeasonalPattern } from '../../services/ForecastEngine';
import { cn } from '../../utils';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card, { CardContent, CardHeader, CardTitle } from '../ui/Card';

interface SeasonalityTemplatesProps {
  templates: SeasonalPattern[];
  selectedTemplateId?: string;
  onSelect?: (templateId: string) => void;
  onAdd?: (template: SeasonalPattern) => void;
  onUpdate?: (templateId: string, pattern: number[]) => void;
  onDelete?: (templateId: string) => void;
  className?: string;
}

const monthNames = [
  'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
  'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'
];

const SeasonalityTemplates: React.FC<SeasonalityTemplatesProps> = ({
  templates,
  selectedTemplateId,
  onSelect,
  onAdd,
  onUpdate,
  onDelete,
  className
}) => {
  const [editingTemplate, setEditingTemplate] = useState<SeasonalPattern | null>(null);
  const [newTemplate, setNewTemplate] = useState<Partial<SeasonalPattern>>({
    name: '',
    pattern: Array(12).fill(1.0)
  });
  const [showAddForm, setShowAddForm] = useState(false);

  // Создание данных для графика
  const createChartData = (pattern: number[], name: string) => ({
    labels: monthNames,
    datasets: [{
      label: name,
      data: pattern,
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 6,
      pointHoverRadius: 8,
      borderWidth: 2,
    }]
  });

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `Коэффициент: ${context.parsed.y.toFixed(2)}`;
          }
        }
      }
    },
    scales: {
      x: {
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
        min: 0,
        max: 3,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          font: {
            size: 11
          },
          stepSize: 0.5
        }
      }
    }
  };

  const handlePatternChange = (monthIndex: number, value: number) => {
    if (editingTemplate) {
      const newPattern = [...editingTemplate.pattern];
      newPattern[monthIndex] = Math.max(0.1, Math.min(3.0, value));
      setEditingTemplate({
        ...editingTemplate,
        pattern: newPattern
      });
    }
  };

  const handleSaveEdit = () => {
    if (editingTemplate && onUpdate) {
      onUpdate(editingTemplate.id, editingTemplate.pattern);
      setEditingTemplate(null);
    }
  };

  const handleAddTemplate = () => {
    if (newTemplate.name && newTemplate.pattern && onAdd) {
      const template: SeasonalPattern = {
        id: `custom_${Date.now()}`,
        name: newTemplate.name,
        pattern: newTemplate.pattern
      };
      onAdd(template);
      setNewTemplate({ name: '', pattern: Array(12).fill(1.0) });
      setShowAddForm(false);
    }
  };

  const handleDuplicateTemplate = (template: SeasonalPattern) => {
    if (onAdd) {
      const duplicated: SeasonalPattern = {
        id: `${template.id}_copy_${Date.now()}`,
        name: `${template.name} (копия)`,
        pattern: [...template.pattern]
      };
      onAdd(duplicated);
    }
  };

  const getSeasonalityDescription = (pattern: number[]): string => {
    const maxIndex = pattern.indexOf(Math.max(...pattern));
    const minIndex = pattern.indexOf(Math.min(...pattern));
    const maxMonth = monthNames[maxIndex];
    const minMonth = monthNames[minIndex];
    const variation = ((Math.max(...pattern) - Math.min(...pattern)) / Math.min(...pattern) * 100).toFixed(0);
    
    return `Пик в ${maxMonth}, минимум в ${minMonth}. Вариация: ${variation}%`;
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Заголовок и действия */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Шаблоны сезонности
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Управление коэффициентами сезонности для прогнозирования
          </p>
        </div>
        
        <Button
          onClick={() => setShowAddForm(true)}
          leftIcon={<PlusIcon className="h-4 w-4" />}
        >
          Добавить шаблон
        </Button>
      </div>

      {/* Форма добавления нового шаблона */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Новый шаблон сезонности</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Input
                label="Название шаблона"
                value={newTemplate.name || ''}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                placeholder="Например: Новогодние товары"
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Коэффициенты по месяцам (0.1 - 3.0)
                </label>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {monthNames.map((month, index) => (
                    <div key={month} className="text-center">
                      <label className="block text-xs text-gray-500 mb-1">{month}</label>
                      <input
                        type="number"
                        min="0.1"
                        max="3.0"
                        step="0.1"
                        value={newTemplate.pattern?.[index] || 1.0}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 1.0;
                          const newPattern = [...(newTemplate.pattern || Array(12).fill(1.0))];
                          newPattern[index] = Math.max(0.1, Math.min(3.0, value));
                          setNewTemplate({ ...newTemplate, pattern: newPattern });
                        }}
                        className="w-full text-xs text-center border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Предварительный просмотр графика */}
              {newTemplate.pattern && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Предварительный просмотр
                  </label>
                  <div className="h-32 bg-gray-50 rounded-lg p-2">
                    <Line 
                      data={createChartData(newTemplate.pattern, newTemplate.name || 'Новый шаблон')} 
                      options={chartOptions} 
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Button onClick={handleAddTemplate}>
                  Создать шаблон
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowAddForm(false);
                    setNewTemplate({ name: '', pattern: Array(12).fill(1.0) });
                  }}
                >
                  Отмена
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Список шаблонов */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {templates.map((template) => (
          <Card 
            key={template.id}
            className={cn(
              "cursor-pointer transition-all duration-200",
              selectedTemplateId === template.id 
                ? "ring-2 ring-blue-500 border-blue-200" 
                : "hover:shadow-md"
            )}
            onClick={() => onSelect?.(template.id)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  <p className="text-xs text-gray-500 mt-1">
                    {getSeasonalityDescription(template.pattern)}
                  </p>
                </div>
                
                <div className="flex items-center space-x-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingTemplate(template);
                    }}
                    className="p-1 rounded hover:bg-gray-100 transition-colors"
                  >
                    <PencilIcon className="h-4 w-4 text-gray-400" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicateTemplate(template);
                    }}
                    className="p-1 rounded hover:bg-gray-100 transition-colors"
                  >
                    <DocumentDuplicateIcon className="h-4 w-4 text-gray-400" />
                  </button>
                  {!template.id.startsWith('default') && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete?.(template.id);
                      }}
                      className="p-1 rounded hover:bg-gray-100 transition-colors"
                    >
                      <TrashIcon className="h-4 w-4 text-red-400" />
                    </button>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              {/* График сезонности */}
              <div className="h-24 mb-4">
                <Line 
                  data={createChartData(template.pattern, template.name)} 
                  options={chartOptions} 
                />
              </div>
              
              {/* Коэффициенты по месяцам */}
              <div className="grid grid-cols-6 gap-1 text-xs">
                {template.pattern.map((coeff, index) => (
                  <div key={index} className="text-center">
                    <div className="text-gray-500">{monthNames[index]}</div>
                    <div className={cn(
                      "font-medium",
                      coeff > 1.5 ? "text-red-600" :
                      coeff > 1.2 ? "text-orange-600" :
                      coeff < 0.8 ? "text-blue-600" : "text-gray-900"
                    )}>
                      {coeff.toFixed(1)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Модальное окно редактирования */}
      {editingTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Редактирование: {editingTemplate.name}
              </h3>
              <button
                onClick={() => setEditingTemplate(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* График */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Визуализация сезонности
                </label>
                <div className="h-48 bg-gray-50 rounded-lg p-4">
                  <Line 
                    data={createChartData(editingTemplate.pattern, editingTemplate.name)} 
                    options={{
                      ...chartOptions,
                      plugins: {
                        ...chartOptions.plugins,
                        legend: { display: true }
                      }
                    }} 
                  />
                </div>
              </div>

              {/* Редактирование коэффициентов */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Коэффициенты сезонности
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {monthNames.map((month, index) => (
                    <div key={month}>
                      <label className="block text-sm text-gray-600 mb-1">
                        {month}
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="range"
                          min="0.1"
                          max="3.0"
                          step="0.1"
                          value={editingTemplate.pattern[index]}
                          onChange={(e) => handlePatternChange(index, parseFloat(e.target.value))}
                          className="flex-1"
                        />
                        <input
                          type="number"
                          min="0.1"
                          max="3.0"
                          step="0.1"
                          value={editingTemplate.pattern[index]}
                          onChange={(e) => handlePatternChange(index, parseFloat(e.target.value) || 1.0)}
                          className="w-16 text-sm text-center border border-gray-300 rounded px-2 py-1"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Быстрые шаблоны */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Быстрые шаблоны
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const pattern = [0.8, 0.7, 0.9, 1.0, 1.1, 1.0, 0.9, 0.8, 1.2, 1.3, 1.8, 2.2];
                      setEditingTemplate({ ...editingTemplate, pattern });
                    }}
                  >
                    Новогодний пик
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const pattern = [0.7, 0.8, 1.2, 1.4, 1.6, 1.8, 1.5, 1.3, 1.1, 0.9, 0.7, 0.8];
                      setEditingTemplate({ ...editingTemplate, pattern });
                    }}
                  >
                    Летний сезон
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const pattern = [0.6, 0.7, 1.2, 1.4, 1.3, 1.0, 0.8, 0.9, 1.3, 1.4, 1.6, 1.2];
                      setEditingTemplate({ ...editingTemplate, pattern });
                    }}
                  >
                    Весна/Осень
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const pattern = Array(12).fill(1.0);
                      setEditingTemplate({ ...editingTemplate, pattern });
                    }}
                  >
                    Без сезонности
                  </Button>
                </div>
              </div>

              {/* Действия */}
              <div className="flex items-center space-x-2 pt-4 border-t">
                <Button onClick={handleSaveEdit}>
                  Сохранить изменения
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setEditingTemplate(null)}
                >
                  Отмена
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeasonalityTemplates; 