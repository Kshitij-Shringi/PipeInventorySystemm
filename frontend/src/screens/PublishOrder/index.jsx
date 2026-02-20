import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyseOrder, getErrorMessage } from '../../api';
import { useToast } from '../../components/Toast';
import OrderForm from './OrderForm';
import AnalysisView from './AnalysisView';
import OrderSummary from './OrderSummary';

export default function PublishOrder({ refreshInventory, refreshOrders }) {
  const navigate = useNavigate();
  const [step, setStep] = useState('form');
  const [analysisResponse, setAnalysisResponse] = useState(null);
  const [executeResult, setExecuteResult] = useState(null);
  const { showToast } = useToast();

  const handleAnalyse = async (payload) => {
    try {
      const data = await analyseOrder(payload);
      setAnalysisResponse(data);
      setStep('analysis');
    } catch (e) {
      showToast(getErrorMessage(e, 'Analysis failed'), 'error');
    }
  };

  const handleExecuted = (result) => {
    setExecuteResult(result);
    setStep('summary');
    refreshOrders?.();
    // Clear form data only after successful order execution
    localStorage.removeItem('orderForm_formData');
  };

  const handleBackToInventory = () => {
    refreshInventory?.();
    navigate('/inventory');
  };

  if (step === 'summary') {
    return (
      <OrderSummary
        result={executeResult}
        onBackToInventory={handleBackToInventory}
      />
    );
  }

  if (step === 'analysis') {
    return (
      <AnalysisView
        analysisResponse={analysisResponse}
        recipient={analysisResponse?.recipient ?? ''}
        onExecuted={handleExecuted}
        onBack={() => setStep('form')}
      />
    );
  }

  return <OrderForm onAnalyse={handleAnalyse} />;
}
