import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSubscriptions } from '../utils/storage';
import { getMonthlyEquivalent, getDaysRemaining, formatDate, formatCurrency } from '../utils/helpers';
import './Statistics.css';

export default function Statistics() {
  const navigate = useNavigate();
  const [monthlyTotals, setMonthlyTotals] = useState({});
  const [activeCount, setActiveCount] = useState(0);
  const [due7DaysTotals, setDue7DaysTotals] = useState({});
  const [savedAmounts, setSavedAmounts] = useState({});
  const [cancelledSubs, setCancelledSubs] = useState([]);

  useEffect(() => {
    const allSubs = getSubscriptions();
    const activeSubs = allSubs.filter(s => s.status !== 'cancelled');
    
    // Secțiunea 1 — "Cheltuieli lunare"
    const mTotals = activeSubs.reduce((acc, sub) => {
      const monthly = getMonthlyEquivalent(sub.amount, sub.cycle);
      acc[sub.currency] = (acc[sub.currency] || 0) + monthly;
      return acc;
    }, {});
    setMonthlyTotals(mTotals);
    setActiveCount(activeSubs.length);

    // Secțiunea 2 — "Scadente în 7 zile"
    const due7Days = activeSubs.filter(sub => {
      const days = getDaysRemaining(sub.renewalDate);
      return days <= 7 && days > 0;
    });
    
    const due7Totals = due7Days.reduce((acc, sub) => {
      acc[sub.currency] = (acc[sub.currency] || 0) + Number(sub.amount);
      return acc;
    }, {});
    setDue7DaysTotals(due7Totals);

    // Secțiunea 3 — "Economii"
    const savedStr = localStorage.getItem('savedAmounts');
    setSavedAmounts(savedStr ? JSON.parse(savedStr) : {});

    // Secțiunea 4 — "Istoric anulări"
    const cancelled = allSubs.filter(s => s.status === 'cancelled');
    setCancelledSubs(cancelled);
  }, []);

  return (
    <div className="statistics-page fade-in">
      <header className="statistics-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Înapoi
        </button>
        <h1 className="statistics-title">Statistici</h1>
      </header>

      <div className="statistics-content">
        <div className="statistics-section">
          <h2>Cheltuieli lunare</h2>
          <div className="statistics-display">
            {Object.keys(monthlyTotals).length === 0 ? (
              <p className="statistics-empty">Niciun abonament activ.</p>
            ) : (
              <>
                {Object.entries(monthlyTotals).map(([currency, amount]) => (
                  <div key={currency} className="statistics-row">
                    <span className="statistics-amount">{formatCurrency(amount, currency)}</span>
                    <span className="statistics-label">/ lună</span>
                  </div>
                ))}
                <div className="statistics-divider" />
                <p className="statistics-count">{activeCount} abonamente active</p>
              </>
            )}
          </div>
        </div>

        <div className="statistics-section">
          <h2>Scadente în 7 zile</h2>
          <div className="statistics-display">
            {Object.keys(due7DaysTotals).length === 0 ? (
              <p className="statistics-empty">Nicio plată scadentă în 7 zile. ✓</p>
            ) : (
              <p className="statistics-due-text">
                {Object.entries(due7DaysTotals).map(([currency, amount], index, arr) => (
                  <span key={currency}>
                    {formatCurrency(amount, currency)}
                    {index < arr.length - 1 ? ' + ' : ''}
                  </span>
                ))}
                {' '}de plătit săptămâna asta
              </p>
            )}
          </div>
        </div>

        <div className="statistics-section">
          <h2>Economii</h2>
          <div className="statistics-display">
            {!savedAmounts || Object.keys(savedAmounts).length === 0 ? (
              <p className="statistics-empty">Nu ai economisit nimic încă.</p>
            ) : (
              <>
                {Object.entries(savedAmounts).map(([currency, amount]) => (
                  <div key={currency} className="statistics-row">
                    <span className="statistics-amount">{formatCurrency(amount, currency)}</span>
                    <span className="statistics-label"> total</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        <div className="statistics-section">
          <h2>Istoric anulări</h2>
          <div className="statistics-display">
            {cancelledSubs.length === 0 ? (
              <p className="statistics-empty">Niciun abonament anulat încă.</p>
            ) : (
              <div className="cancelled-list">
                {cancelledSubs.map(sub => (
                  <div key={sub.id} className="cancelled-item">
                    <div className="cancelled-item-main">
                      <span className="cancelled-name">{sub.name}</span>
                      <span className="cancelled-amount">{formatCurrency(sub.amount, sub.currency)}</span>
                    </div>
                    <div className="cancelled-item-sub">
                      Data reînnoirii: {formatDate(sub.renewalDate)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {activeCount === 0 && (
          <div className="statistics-section">
            <h2>Începe rapid</h2>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
              Adaugă primul abonament în câteva secunde:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { name: 'Netflix', logo: '🎬' },
                { name: 'Spotify', logo: '🎵' },
                { name: 'iCloud', logo: '☁️' },
                { name: 'Gym', logo: '💪' },
              ].map(({ name, logo }) => (
                <button
                  key={name}
                  className="btn-secondary"
                  style={{ 
                    display: 'flex', alignItems: 'center', 
                    gap: '10px', padding: '12px 16px',
                    textAlign: 'left'
                  }}
                  onClick={() => navigate(`/add?preset=${name}`)}
                >
                  <span style={{ fontSize: '20px' }}>{logo}</span>
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>{name}</span>
                  <span style={{ marginLeft: 'auto', color: '#6b7280', fontSize: '12px' }}>
                    Adaugă →
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
