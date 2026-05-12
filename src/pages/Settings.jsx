import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSubscriptions, saveSubscriptions } from '../utils/storage';
import './Settings.css';

export default function Settings() {
  const navigate = useNavigate();
  const [defaultCurrency, setDefaultCurrency] = useState('RON');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [showIOSSteps, setShowIOSSteps] = useState(false);
  const [notifStatus, setNotifStatus] = useState(() => {
    try {
      return typeof Notification !== 'undefined' ? Notification.permission : 'default';
    } catch {
      return 'default';
    }
  });

  useEffect(() => {
    const savedCurrency = localStorage.getItem('defaultCurrency') || 'RON';
    setDefaultCurrency(savedCurrency);
  }, []);

  useEffect(() => {
    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua);
    const android = /android/i.test(ua);
    setIsIOS(ios);
    setIsAndroid(android);

    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleCurrencyChange = (currency) => {
    setDefaultCurrency(currency);
    localStorage.setItem('defaultCurrency', currency);
  };

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setShowInstall(false);
  };

  const handleEnableNotifications = async () => {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: import.meta.env.VITE_VAPID_PUBLIC_KEY
      });
      const subscriptions = getSubscriptions();
      await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub, subscriptions })
      });
      setNotifStatus('granted');
    } else if (permission === 'denied') {
      setNotifStatus('denied');
    }
  };

  const handleSyncSubscriptions = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: sub, subscriptions: getSubscriptions() })
        });
        setSyncMsg('✓ Sincronizat!');
        setTimeout(() => setSyncMsg(''), 3000);
      }
    } catch {
      setSyncMsg('Eroare la sincronizare');
      setTimeout(() => setSyncMsg(''), 3000);
    }
  };

  const handleDisableNotifications = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await fetch('/api/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint })
        });
      }
      setNotifStatus('default');
    } catch (err) {
      console.error('Error disabling notifications:', err);
    }
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
          <h2>Instalează aplicația</h2>

          {showInstall && (
            <button className="btn-secondary" style={{ width: '100%', marginBottom: 12 }} onClick={handleInstall}>
              📲 Instalează pe acest dispozitiv
            </button>
          )}

          {isIOS && (
            <div>
              <button
                className="btn-secondary"
                style={{ width: '100%', marginBottom: 12 }}
                onClick={() => setShowIOSSteps(prev => !prev)}
              >
                🍎 Instrucțiuni pentru iPhone / iPad
              </button>
              {showIOSSteps && (
                <div style={{
                  background: '#21262d',
                  borderRadius: 10,
                  padding: '14px 16px',
                  fontSize: 13,
                  color: '#c9d1d9',
                  lineHeight: 1.8,
                  marginBottom: 12
                }}>
                  <p style={{ margin: '0 0 8px', fontWeight: 600, color: '#58a6ff' }}>Cum instalezi pe iOS (Safari):</p>
                  <p style={{ margin: '0 0 4px' }}>1. Deschide aplicația în <strong>Safari</strong></p>
                  <p style={{ margin: '0 0 4px' }}>2. Apasă butonul <strong>Share</strong> (pătrățel cu săgeată în sus ↑)</p>
                  <p style={{ margin: '0 0 4px' }}>3. Derulează și apasă <strong>"Adaugă la ecranul principal"</strong></p>
                  <p style={{ margin: 0 }}>4. Apasă <strong>Adaugă</strong> ✓</p>
                </div>
              )}
            </div>
          )}

          {!showInstall && !isIOS && (
            <div style={{
              background: '#21262d',
              borderRadius: 10,
              padding: '14px 16px',
              fontSize: 13,
              color: '#8b949e',
              lineHeight: 1.7
            }}>
              <p style={{ margin: '0 0 6px', fontWeight: 600, color: '#c9d1d9' }}>Cum instalezi manual:</p>
              <p style={{ margin: '0 0 4px' }}>• <strong>Chrome Android:</strong> meniu ⋮ → "Adaugă pe ecranul principal"</p>
              <p style={{ margin: '0 0 4px' }}>• <strong>Chrome Desktop:</strong> iconița ⊕ din bara de adresă</p>
              <p style={{ margin: 0 }}>• <strong>Samsung Browser:</strong> meniu → "Adaugă pagina la" → Ecran principal</p>
            </div>
          )}
        </div>

        <div className="settings-section">
          <h2>Notificări</h2>
          {notifStatus === 'granted' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <p style={{
                color: '#3fb950',
                fontWeight: 600,
                fontSize: 14,
                margin: 0
              }}>
                ✓ Notificările sunt active
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <button
                  onClick={handleSyncSubscriptions}
                  style={{
                    background: 'rgba(88,166,255,0.1)',
                    border: '1px solid rgba(88,166,255,0.3)',
                    color: '#58a6ff',
                    borderRadius: 6,
                    padding: '4px 10px',
                    fontSize: 12,
                    cursor: 'pointer',
                    fontWeight: 500
                  }}
                >
                  🔄 Sincronizează
                </button>
                <span style={{ fontSize: 11, color: '#484f58', marginTop: 4 }}>
                  Sincronizare automată la fiecare modificare
                </span>
              </div>
              <button
                onClick={handleDisableNotifications}
                style={{
                  background: 'rgba(248,81,73,0.1)',
                  border: '1px solid rgba(248,81,73,0.3)',
                  color: '#f85149',
                  borderRadius: 6,
                  padding: '4px 10px',
                  fontSize: 12,
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                🔕 Dezactivează
              </button>
              {syncMsg && (
                <span style={{
                  fontSize: 12,
                  color: syncMsg.startsWith('✓') ? '#3fb950' : '#f85149',
                  fontWeight: 500
                }}>
                  {syncMsg}
                </span>
              )}
            </div>
          )}
          {notifStatus === 'denied' && (
            <p style={{
              color: '#f85149',
              fontWeight: 500,
              fontSize: 13,
              margin: 0,
              lineHeight: 1.6
            }}>
              Notificările sunt blocate în browser. Activează-le din setările browserului.
            </p>
          )}
          {notifStatus === 'default' && (
            <button
              className="btn-secondary"
              style={{ width: '100%' }}
              onClick={handleEnableNotifications}
            >
              🔔 Activează notificările
            </button>
          )}
        </div>

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
