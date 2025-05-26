import React from 'react';
import { BellIcon, UserIcon } from '@heroicons/react/24/outline';

const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center">
          <h2 className="text-lg font-semibold text-gray-800">
            Панель управления
          </h2>
        </div>
        
        <div className="flex items-center space-x-4">
          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <BellIcon className="h-5 w-5" />
          </button>
          
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
              <UserIcon className="h-5 w-5 text-primary-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">
              Администратор
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 