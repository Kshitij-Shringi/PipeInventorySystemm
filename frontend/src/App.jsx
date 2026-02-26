import React, { useCallback, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import Navbar from './components/Navbar';
import Inventory from './screens/Inventory';
import AddStock from './screens/AddStock';
import PublishOrder from './screens/PublishOrder';
import Orders from './screens/Orders';
import Login from './screens/Login';
import RegisterTenant from './screens/RegisterTenant';
import Users from './screens/Users';
import AdminLogin from './screens/AdminLogin';
import AdminDashboard from './screens/AdminDashboard';
import { AuthProvider, useAuth } from './AuthContext';

function PrivateRoute({ element }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return element;
}

function AdminRoute({ element }) {
  const { isAuthenticated, isTenantAdmin } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (!isTenantAdmin) {
    return <Navigate to="/inventory" replace />;
  }
  return element;
}

function AppContent() {
  const [inventoryRefresh, setInventoryRefresh] = useState(0);
  const [ordersRefresh, setOrdersRefresh] = useState(0);
  const location = useLocation();

  const isAuthRoute =
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname.startsWith('/admin');

  const refreshInventory = useCallback(() => {
    setInventoryRefresh((n) => n + 1);
  }, []);
  const refreshOrders = useCallback(() => {
    setOrdersRefresh((n) => n + 1);
  }, []);

  return (
    <div className="min-h-screen app-bg relative">
      {!isAuthRoute && <Navbar />}
      <main
        className={
          isAuthRoute
            ? 'relative z-10 min-h-screen flex items-center justify-center'
            : 'relative z-10 pb-24 pt-6 lg:pl-[19rem]'
        }
      >
        <Routes>
          <Route path="/" element={<Navigate to="/inventory" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<RegisterTenant />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/inventory" element={<PrivateRoute element={<Inventory refreshTrigger={inventoryRefresh} />} />} />
          <Route
            path="/add-stock"
            element={
              <PrivateRoute
                element={<AddStock refreshInventory={refreshInventory} refreshOrders={refreshOrders} />}
              />
            }
          />
          <Route
            path="/publish-order/*"
            element={
              <PrivateRoute
                element={
                  <PublishOrder
                    refreshInventory={refreshInventory}
                    refreshOrders={refreshOrders}
                  />
                }
              />
            }
          />
          <Route
            path="/orders"
            element={<PrivateRoute element={<Orders refreshTrigger={ordersRefresh} />} />}
          />
          <Route path="/users" element={<AdminRoute element={<Users />} />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}
