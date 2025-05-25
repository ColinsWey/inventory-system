import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleMenuClick = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Боковая панель */}
      <Sidebar isOpen={sidebarOpen} onClose={handleSidebarClose} />

      {/* Основной контент */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        {/* Заголовок */}
        <Header onMenuClick={handleMenuClick} />

        {/* Контент страницы */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout; 