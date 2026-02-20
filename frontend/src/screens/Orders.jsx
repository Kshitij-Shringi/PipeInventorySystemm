import React, { useState, useEffect } from 'react';
import { ClipboardList, Package, Loader2 } from 'lucide-react';
import { fetchOrders, fetchStockActivity, getErrorMessage } from '../api';
import { useToast } from '../components/Toast';
import OrderHistory from '../components/OrderHistory';
import StockActivity from '../components/StockActivity';

export default function Orders({ refreshTrigger }) {
  const [activeTab, setActiveTab] = useState('orders');
  const { showToast } = useToast();

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/15 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="font-sans font-bold text-lg text-white">Activity</h2>
              <p className="font-sans text-sm text-muted mt-0.5">Order and stock history</p>
            </div>
          </div>
        </div>
        <div className="border-b border-border">
          <div className="flex gap-1 px-6">
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-3 font-sans text-sm font-medium transition-all duration-200 border-b-2 ${
                activeTab === 'orders'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted hover:text-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <ClipboardList size={18} />
                Order History
              </div>
            </button>
            <button
              onClick={() => setActiveTab('stock')}
              className={`px-4 py-3 font-sans text-sm font-medium transition-all duration-200 border-b-2 ${
                activeTab === 'stock'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted hover:text-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <Package size={18} />
                Add Stock Activity
              </div>
            </button>
          </div>
        </div>
        <div className="card-body">
          {activeTab === 'orders' && <OrderHistory refreshTrigger={refreshTrigger} />}
          {activeTab === 'stock' && <StockActivity refreshTrigger={refreshTrigger} />}
        </div>
      </div>
    </div>
  );
}
