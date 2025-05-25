import React, { useState, useRef } from 'react';
import {
  ArrowUpTrayIcon,
  DocumentArrowUpIcon,
  CloudArrowUpIcon,
  CogIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { cn } from '../../utils';
import Button from '../ui/Button';

interface ImportSource {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  acceptedFormats: string[];
  maxSize?: number; // в MB
  color: string;
}

interface ImportProgress {
  status: 'idle' | 'uploading' | 'processing' | 'success' | 'error';
  progress: number;
  message?: string;
  details?: {
    total: number;
    processed: number;
    created: number;
    updated: number;
    errors: number;
  };
}

interface ImportButtonProps {
  onImport?: (source: string, file?: File, data?: any) => Promise<void>;
  onConfigure?: (source: string) => void;
  disabled?: boolean;
  variant?: 'default' | 'compact' | 'dropdown';
  sources?: ImportSource[];
  className?: string;
}

const defaultSources: ImportSource[] = [
  {
    id: 'csv',
    name: 'CSV файл',
    description: 'Импорт из CSV файла',
    icon: DocumentArrowUpIcon,
    acceptedFormats: ['.csv'],
    maxSize: 10,
    color: 'text-blue-600'
  },
  {
    id: 'excel',
    name: 'Excel файл',
    description: 'Импорт из Excel файла',
    icon: DocumentArrowUpIcon,
    acceptedFormats: ['.xlsx', '.xls'],
    maxSize: 25,
    color: 'text-green-600'
  },
  {
    id: 'salesdrive',
    name: 'SalesDrive',
    description: 'Синхронизация с SalesDrive API',
    icon: CloudArrowUpIcon,
    acceptedFormats: [],
    color: 'text-purple-600'
  },
  {
    id: 'manual',
    name: 'Ручной ввод',
    description: 'Добавление товаров вручную',
    icon: ArrowUpTrayIcon,
    acceptedFormats: [],
    color: 'text-gray-600'
  }
];

const ImportButton: React.FC<ImportButtonProps> = ({
  onImport,
  onConfigure,
  disabled = false,
  variant = 'default',
  sources = defaultSources,
  className
}) => {
  const [progress, setProgress] = useState<ImportProgress>({ status: 'idle', progress: 0 });
  const [selectedSource, setSelectedSource] = useState<ImportSource | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (source: ImportSource, file: File) => {
    if (!onImport) return;

    // Проверка размера файла
    if (source.maxSize && file.size > source.maxSize * 1024 * 1024) {
      setProgress({
        status: 'error',
        progress: 0,
        message: `Файл слишком большой. Максимальный размер: ${source.maxSize}MB`
      });
      return;
    }

    // Проверка формата файла
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (source.acceptedFormats.length > 0 && !source.acceptedFormats.includes(fileExtension)) {
      setProgress({
        status: 'error',
        progress: 0,
        message: `Неподдерживаемый формат файла. Поддерживаются: ${source.acceptedFormats.join(', ')}`
      });
      return;
    }

    try {
      setProgress({ status: 'uploading', progress: 0, message: 'Загрузка файла...' });
      
      // Симуляция прогресса загрузки
      for (let i = 0; i <= 100; i += 10) {
        setProgress(prev => ({ ...prev, progress: i }));
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setProgress({ status: 'processing', progress: 0, message: 'Обработка данных...' });
      
      await onImport(source.id, file);
      
      setProgress({
        status: 'success',
        progress: 100,
        message: 'Импорт завершен успешно',
        details: {
          total: 150,
          processed: 150,
          created: 120,
          updated: 25,
          errors: 5
        }
      });

      // Сброс через 3 секунды
      setTimeout(() => {
        setProgress({ status: 'idle', progress: 0 });
      }, 3000);

    } catch (error: any) {
      setProgress({
        status: 'error',
        progress: 0,
        message: error.message || 'Ошибка при импорте'
      });
    }
  };

  const handleSourceSelect = async (source: ImportSource) => {
    setSelectedSource(source);

    if (source.acceptedFormats.length > 0) {
      // Файловый импорт
      fileInputRef.current?.click();
    } else {
      // API импорт или ручной ввод
      if (onImport) {
        try {
          setProgress({ status: 'processing', progress: 0, message: `Подключение к ${source.name}...` });
          await onImport(source.id);
          setProgress({
            status: 'success',
            progress: 100,
            message: 'Синхронизация завершена'
          });
          setTimeout(() => {
            setProgress({ status: 'idle', progress: 0 });
          }, 3000);
        } catch (error: any) {
          setProgress({
            status: 'error',
            progress: 0,
            message: error.message || 'Ошибка синхронизации'
          });
        }
      }
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && selectedSource) {
      handleFileSelect(selectedSource, file);
    }
    // Сброс input для возможности повторного выбора того же файла
    event.target.value = '';
  };

  // Компонент прогресса
  const ProgressIndicator: React.FC = () => {
    if (progress.status === 'idle') return null;

    const getStatusIcon = () => {
      switch (progress.status) {
        case 'uploading':
        case 'processing':
          return (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          );
        case 'success':
          return <CheckCircleIcon className="h-4 w-4 text-green-600" />;
        case 'error':
          return <XCircleIcon className="h-4 w-4 text-red-600" />;
        default:
          return null;
      }
    };

    const getStatusColor = () => {
      switch (progress.status) {
        case 'uploading':
        case 'processing':
          return 'bg-blue-50 border-blue-200';
        case 'success':
          return 'bg-green-50 border-green-200';
        case 'error':
          return 'bg-red-50 border-red-200';
        default:
          return 'bg-gray-50 border-gray-200';
      }
    };

    return (
      <div className={cn("mt-4 p-4 rounded-lg border", getStatusColor())}>
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">
              {progress.message}
            </p>
            
            {(progress.status === 'uploading' || progress.status === 'processing') && (
              <div className="mt-2">
                <div className="bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress.progress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {progress.progress}%
                </p>
              </div>
            )}

            {progress.details && progress.status === 'success' && (
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-600">
                <div>Всего: {progress.details.total}</div>
                <div>Обработано: {progress.details.processed}</div>
                <div>Создано: {progress.details.created}</div>
                <div>Обновлено: {progress.details.updated}</div>
                {progress.details.errors > 0 && (
                  <div className="col-span-2 text-red-600">
                    Ошибок: {progress.details.errors}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Компактный вариант
  if (variant === 'compact') {
    return (
      <div className={cn("", className)}>
        <Menu as="div" className="relative inline-block text-left">
          <Menu.Button
            as={Button}
            size="sm"
            disabled={disabled || progress.status !== 'idle'}
            leftIcon={<ArrowUpTrayIcon className="h-4 w-4" />}
          >
            Импорт
          </Menu.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute right-0 z-10 mt-2 w-64 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="py-1">
                {sources.map((source) => (
                  <Menu.Item key={source.id}>
                    {({ active }) => (
                      <button
                        onClick={() => handleSourceSelect(source)}
                        className={cn(
                          active ? 'bg-gray-100' : '',
                          'flex items-center w-full text-left px-4 py-3 text-sm'
                        )}
                      >
                        <source.icon className={cn("h-5 w-5 mr-3", source.color)} />
                        <div>
                          <div className="font-medium text-gray-900">
                            {source.name}
                          </div>
                          <div className="text-gray-500 text-xs">
                            {source.description}
                          </div>
                        </div>
                      </button>
                    )}
                  </Menu.Item>
                ))}
              </div>
            </Menu.Items>
          </Transition>
        </Menu>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={selectedSource?.acceptedFormats.join(',')}
          onChange={handleFileChange}
        />

        <ProgressIndicator />
      </div>
    );
  }

  // Dropdown вариант
  if (variant === 'dropdown') {
    return (
      <div className={cn("", className)}>
        <Menu as="div" className="relative inline-block text-left">
          <Menu.Button
            as={Button}
            disabled={disabled || progress.status !== 'idle'}
            leftIcon={<ArrowUpTrayIcon className="h-4 w-4" />}
          >
            Импорт данных
          </Menu.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute right-0 z-10 mt-2 w-80 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">
                  Выберите источник данных
                </h3>
                <div className="space-y-2">
                  {sources.map((source) => (
                    <button
                      key={source.id}
                      onClick={() => handleSourceSelect(source)}
                      className="w-full flex items-center p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                      <source.icon className={cn("h-6 w-6 mr-3", source.color)} />
                      <div className="flex-1 text-left">
                        <div className="font-medium text-gray-900 text-sm">
                          {source.name}
                        </div>
                        <div className="text-gray-500 text-xs">
                          {source.description}
                        </div>
                        {source.acceptedFormats.length > 0 && (
                          <div className="text-gray-400 text-xs mt-1">
                            {source.acceptedFormats.join(', ')}
                            {source.maxSize && ` • до ${source.maxSize}MB`}
                          </div>
                        )}
                      </div>
                      {onConfigure && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onConfigure(source.id);
                          }}
                          className="p-1 rounded hover:bg-gray-200 transition-colors"
                        >
                          <CogIcon className="h-4 w-4 text-gray-400" />
                        </button>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </Menu.Items>
          </Transition>
        </Menu>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={selectedSource?.acceptedFormats.join(',')}
          onChange={handleFileChange}
        />

        <ProgressIndicator />
      </div>
    );
  }

  // Стандартный вариант
  return (
    <div className={cn("bg-white rounded-lg border border-gray-200 p-6", className)}>
      <div className="text-center mb-6">
        <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-lg font-semibold text-gray-900">
          Импорт товаров
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Выберите источник данных для импорта товаров
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sources.map((source) => (
          <button
            key={source.id}
            onClick={() => handleSourceSelect(source)}
            disabled={disabled || progress.status !== 'idle'}
            className={cn(
              "p-4 rounded-lg border-2 border-dashed transition-all duration-200",
              "hover:border-gray-400 hover:bg-gray-50",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            )}
          >
            <div className="text-center">
              <source.icon className={cn("mx-auto h-8 w-8 mb-2", source.color)} />
              <h4 className="text-sm font-medium text-gray-900">
                {source.name}
              </h4>
              <p className="text-xs text-gray-500 mt-1">
                {source.description}
              </p>
              {source.acceptedFormats.length > 0 && (
                <p className="text-xs text-gray-400 mt-2">
                  {source.acceptedFormats.join(', ')}
                  {source.maxSize && ` • до ${source.maxSize}MB`}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={selectedSource?.acceptedFormats.join(',')}
        onChange={handleFileChange}
      />

      <ProgressIndicator />

      {/* Информация о форматах */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-start space-x-3">
          <InformationCircleIcon className="h-5 w-5 text-blue-500 mt-0.5" />
          <div className="text-sm text-blue-700">
            <h4 className="font-medium">Требования к файлам:</h4>
            <ul className="mt-2 space-y-1 text-xs">
              <li>• CSV файлы должны содержать заголовки: название, SKU, цена, остаток</li>
              <li>• Excel файлы поддерживают форматы .xlsx и .xls</li>
              <li>• Максимальный размер файла: 25MB</li>
              <li>• Кодировка: UTF-8</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportButton; 