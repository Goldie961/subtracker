import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSubscriptions, saveSubscriptions } from '../utils/storage';
import './Settings.css';

export default function Settings() {
  const navigate = useNavigate();
  const [defaultCurrency, setDefaultCurrency] = useState('RON');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    const savedCurrency = localStorage.getItem('defaultCurrency') || 'RON';
    setDefaultCurrency(savedCurrency);
  }, []);

  const handleCurrencyChange = (currency) => {
    setDefaultCurrency(currency);
    localStorage.setItem('defaultCurrency', currency);
  };

  const handleExportData = () => {
    const subs = getSubscriptions();
    const blob = new Blob([JSON.stringify(subs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subtracker-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const subs = getSubscriptions();
    const headers = ['Nume', 'Suma', 'Moneda', 'Ciclu', 'Data reinnoirii', 'Intentie', 'Status'];
    const cycleMap = { monthly: 'Lunar', yearly: 'Anual', custom: 'Personalizat' };
    const intentMap = { renew: 'Reinnoire', cancel: 'Anulare' };
    const rows = subs.map(s => [
      s.name,
      s.amount,
      s.currency,
      cycleMap[s.cycle] || s.cycle,
      s.renewalDate,
      intentMap[s.intent] || s.intent,
      s.status === 'cancelled' ? 'Anulat' : 'Activ'
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(val => `"${val}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subtracker-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (!Array.isArray(data)) throw new Error("Not an array");
        
        const isValid = data.every(item => item.id && item.name && item.amount !== undefined && item.renewalDate);
        if (!isValid) throw new Error("Invalid fields");

        saveSubscriptions(data);
        navigate('/');
      } catch (err) {
        alert("Fișier invalid.");
      }
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  const handleClearData = () => {
    localStorage.removeItem('subscriptions');
    localStorage.removeItem('savedAmounts');
    localStorage.removeItem('dismissedBanners');
    localStorage.removeItem('defaultCurrency');
    navigate('/');
  };

  return (
    <div className="settings-page fade-in">
      <header className="settings-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Înapoi
        </button>
        <h1 className="settings-title">Setări</h1>
      </header>

      <div className="settings-content">

        <div className="settings-section">
          <h2>Date</h2>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
            <button className="btn-secondary" style={{ flex: 1 }} onClick={handleExportData}>
              📥 JSON
            </button>
            <button className="btn-secondary" style={{ flex: 1 }} onClick={handleExportCSV}>
              📊 CSV
            </button>
          </div>
          <label className="btn-secondary" style={{ 
            width: '100%', textAlign: 'center', 
            cursor: 'pointer', margin: '0 0 12px 0',
            display: 'block'
          }}>
            📤 Importă date
            <input
              type="file"
              accept="application/json"
              style={{ display: 'none' }}
              onChange={handleImportData}
            />
          </label>
          <button className="btn-danger" style={{ width: '100%', marginBottom: '12px' }} onClick={() => setShowClearConfirm(true)}>
            🗑️ Șterge toate datele
          </button>
          <button
            className="btn-secondary"
            style={{ width: '100%' }}
            onClick={() => {
              localStorage.removeItem('onboardingComplete');
              navigate('/');
              window.dispatchEvent(new Event('onboarding-reset'));
            }}
          >
            Resetează tutorial
          </button>
        </div>
      </div>

      <div className="settings-footer">
        <p>SubTrack v1.0</p>
      </div>

      {showClearConfirm && (
        <div className="confirm-overlay" onClick={() => setShowClearConfirm(false)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Ștergi toate datele?</h3>
            <p>Aceasta va șterge permanent toate abonamentele și setările tale. Acțiunea nu poate fi anulată.</p>
            <div className="confirm-actions">
              <button className="btn-secondary" onClick={() => setShowClearConfirm(false)}>
                Anulează
              </button>
              <button className="btn-danger" onClick={handleClearData}>
                Da, șterge tot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
