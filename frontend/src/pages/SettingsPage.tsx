import React from 'react';
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/Card';

const SettingsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Настройки</h1>
        <p className="mt-1 text-sm text-gray-600">
          Конфигурация системы и интеграций
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Системные настройки</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500">
              Страница в разработке
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage; 