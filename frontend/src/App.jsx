import React, { useCallback, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import Navbar from './components/Navbar';
import Inventory from './screens/Inventory';
import AddStock from './screens/AddStock';
import PublishOrder from './screens/PublishOrder';
import Orders from './screens/Orders';

function AppContent() {
  const [inventoryRefresh, setInventoryRefresh] = useState(0);
  const [ordersRefresh, setOrdersRefresh] = useState(0);

  const refreshInventory = useCallback(() => {
    setInventoryRefresh((n) => n + 1);
  }, []);
  const refreshOrders = useCallback(() => {
    setOrdersRefresh((n) => n + 1);
  }, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#0f1117] app-bg">
        <Navbar />
        <main className="animate-fade-in">
          <Routes>
            <Route path="/" element={<Navigate to="/inventory" replace />} />
            <Route path="/inventory" element={<Inventory refreshTrigger={inventoryRefresh} />} />
            <Route path="/add-stock" element={<AddStock refreshInventory={refreshInventory} refreshOrders={refreshOrders} />} />
            <Route
              path="/publish-order/*"
              element={
                <PublishOrder
                  refreshInventory={refreshInventory}
                  refreshOrders={refreshOrders}
                />
              }
            />
            <Route path="/orders" element={<Orders refreshTrigger={ordersRefresh} />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
