import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Layout from './components/layout/Layout';

// Страницы
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CategoriesPage from './pages/CategoriesPage';
import SalesPage from './pages/SalesPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ImportPage from './pages/ImportPage';
import LogsPage from './pages/LogsPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';
import ForecastDashboard from './pages/ForecastDashboard';

// Создание клиента React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 минут
      gcTime: 10 * 60 * 1000, // 10 минут
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="App">
            <Routes>
              {/* Публичные маршруты */}
              <Route path="/login" element={<LoginPage />} />

              {/* Защищенные маршруты */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                {/* Главная страница */}
                <Route index element={<DashboardPage />} />
                
                {/* Товары */}
                <Route path="products" element={<ProductsPage />} />
                <Route path="products/:id" element={<ProductDetailPage />} />
                
                {/* Категории */}
                <Route path="categories" element={<CategoriesPage />} />
                
                {/* Продажи */}
                <Route path="sales" element={<SalesPage />} />
                
                {/* Аналитика */}
                <Route path="analytics" element={<AnalyticsPage />} />
                
                {/* Импорт */}
                <Route path="import" element={<ImportPage />} />
                
                {/* Логи */}
                <Route path="logs" element={<LogsPage />} />
                
                {/* Настройки */}
                <Route path="settings" element={<SettingsPage />} />

                {/* Прогноз */}
                <Route path="forecast" element={<ForecastDashboard />} />
              </Route>

              {/* 404 страница */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>

            {/* Уведомления */}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#4ade80',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 5000,
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </div>
        </Router>
      </AuthProvider>

      {/* React Query DevTools (только в разработке) */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}

export default App; 