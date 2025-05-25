import React from 'react';
import { cn } from '../../utils';

interface ColorIndicatorProps {
  current: number;
  min: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
}

type IndicatorStatus = 'critical' | 'low' | 'normal' | 'excess';

const ColorIndicator: React.FC<ColorIndicatorProps> = ({
  current,
  min,
  max,
  size = 'md',
  showTooltip = true,
  className
}) => {
  const getStatus = (): IndicatorStatus => {
    if (current === 0) return 'critical';
    if (current <= min) return 'low';
    if (max && current >= max) return 'excess';
    return 'normal';
  };

  const status = getStatus();

  const getStatusConfig = () => {
    switch (status) {
      case 'critical':
        return {
          color: 'bg-red-500',
          text: 'Нет в наличии',
          textColor: 'text-red-700',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      case 'low':
        return {
          color: 'bg-yellow-500',
          text: 'Низкий остаток',
          textColor: 'text-yellow-700',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200'
        };
      case 'normal':
        return {
          color: 'bg-green-500',
          text: 'В наличии',
          textColor: 'text-green-700',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      case 'excess':
        return {
          color: 'bg-blue-500',
          text: 'Избыток',
          textColor: 'text-blue-700',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        };
    }
  };

  const config = getStatusConfig();

  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4'
  };

  const tooltipContent = `
    Текущий остаток: ${current}
    Минимальный уровень: ${min}
    ${max ? `Максимальный уровень: ${max}` : ''}
    Статус: ${config.text}
  `.trim();

  return (
    <div className={cn("relative inline-flex items-center", className)}>
      <div
        className={cn(
          "rounded-full flex-shrink-0 transition-all duration-200",
          config.color,
          sizeClasses[size]
        )}
        title={showTooltip ? tooltipContent : undefined}
      />
      
      {/* Пульсация для критического состояния */}
      {status === 'critical' && (
        <div
          className={cn(
            "absolute rounded-full animate-ping",
            config.color,
            sizeClasses[size]
          )}
        />
      )}
    </div>
  );
};

// Компонент с расширенной информацией
interface ColorIndicatorWithLabelProps extends ColorIndicatorProps {
  label?: string;
  showPercentage?: boolean;
}

export const ColorIndicatorWithLabel: React.FC<ColorIndicatorWithLabelProps> = ({
  current,
  min,
  max,
  label,
  showPercentage = false,
  size = 'md',
  className
}) => {
  const getStatus = (): IndicatorStatus => {
    if (current === 0) return 'critical';
    if (current <= min) return 'low';
    if (max && current >= max) return 'excess';
    return 'normal';
  };

  const status = getStatus();

  const getStatusConfig = () => {
    switch (status) {
      case 'critical':
        return {
          color: 'bg-red-500',
          text: 'Критично',
          textColor: 'text-red-700',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      case 'low':
        return {
          color: 'bg-yellow-500',
          text: 'Мало',
          textColor: 'text-yellow-700',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200'
        };
      case 'normal':
        return {
          color: 'bg-green-500',
          text: 'Достаточно',
          textColor: 'text-green-700',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      case 'excess':
        return {
          color: 'bg-blue-500',
          text: 'Избыток',
          textColor: 'text-blue-700',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        };
    }
  };

  const config = getStatusConfig();

  const getPercentage = () => {
    if (!max || max === 0) return null;
    return Math.round((current / max) * 100);
  };

  const percentage = getPercentage();

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <ColorIndicator
        current={current}
        min={min}
        max={max}
        size={size}
        showTooltip={false}
      />
      
      <div className="flex flex-col">
        <span className={cn("text-xs font-medium", config.textColor)}>
          {label || config.text}
        </span>
        {showPercentage && percentage !== null && (
          <span className="text-xs text-gray-500">
            {percentage}%
          </span>
        )}
      </div>
    </div>
  );
};

// Компонент прогресс-бара с цветовой индикацией
interface ColorProgressBarProps {
  current: number;
  min: number;
  max: number;
  height?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  className?: string;
}

export const ColorProgressBar: React.FC<ColorProgressBarProps> = ({
  current,
  min,
  max,
  height = 'md',
  showLabels = true,
  className
}) => {
  const percentage = Math.min(Math.max((current / max) * 100, 0), 100);
  const minPercentage = (min / max) * 100;

  const getBarColor = () => {
    if (current === 0) return 'bg-red-500';
    if (current <= min) return 'bg-yellow-500';
    if (current >= max) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const heightClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  return (
    <div className={cn("w-full", className)}>
      {showLabels && (
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>0</span>
          <span className="text-yellow-600">Мин: {min}</span>
          <span>{max}</span>
        </div>
      )}
      
      <div className={cn("w-full bg-gray-200 rounded-full relative", heightClasses[height])}>
        {/* Минимальная отметка */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 rounded-full"
          style={{ left: `${minPercentage}%` }}
        />
        
        {/* Прогресс-бар */}
        <div
          className={cn("h-full rounded-full transition-all duration-300", getBarColor())}
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {showLabels && (
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>Текущий: {current}</span>
          <span>{percentage.toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
};

// Компонент статусной карточки
interface StatusCardProps {
  title: string;
  current: number;
  min: number;
  max?: number;
  unit?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  className?: string;
}

export const StatusCard: React.FC<StatusCardProps> = ({
  title,
  current,
  min,
  max,
  unit = 'шт',
  trend,
  className
}) => {
  const getStatus = (): IndicatorStatus => {
    if (current === 0) return 'critical';
    if (current <= min) return 'low';
    if (max && current >= max) return 'excess';
    return 'normal';
  };

  const status = getStatus();

  const getStatusConfig = () => {
    switch (status) {
      case 'critical':
        return {
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-700',
          iconColor: 'text-red-500'
        };
      case 'low':
        return {
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-700',
          iconColor: 'text-yellow-500'
        };
      case 'normal':
        return {
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-700',
          iconColor: 'text-green-500'
        };
      case 'excess':
        return {
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-700',
          iconColor: 'text-blue-500'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={cn(
      "p-4 rounded-lg border-2 transition-all duration-200",
      config.bgColor,
      config.borderColor,
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <ColorIndicator
            current={current}
            min={min}
            max={max}
            size="lg"
          />
          <div>
            <h3 className="text-sm font-medium text-gray-900">{title}</h3>
            <p className={cn("text-lg font-semibold", config.textColor)}>
              {current} {unit}
            </p>
          </div>
        </div>
        
        {trend && (
          <div className={cn(
            "text-sm font-medium",
            trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
          )}>
            {trend.direction === 'up' ? '+' : '-'}{Math.abs(trend.value)}%
          </div>
        )}
      </div>
      
      {max && (
        <div className="mt-3">
          <ColorProgressBar
            current={current}
            min={min}
            max={max}
            height="sm"
            showLabels={false}
          />
        </div>
      )}
    </div>
  );
};

export default ColorIndicator; 