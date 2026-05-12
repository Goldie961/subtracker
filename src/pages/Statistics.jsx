import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSubscriptions } from '../utils/storage';
import { getMonthlyEquivalent, getDaysRemaining, formatDate, formatCurrency } from '../utils/helpers';
import './Statistics.css';

export default function Statistics() {
  const navigate = useNavigate();
  const [monthlyTotals, setMonthlyTotals] = useState({});
  const [activeCount, setActiveCount] = useState(0);
  const [mostExpensive, setMostExpensive] = useState(null);
  const [savedAmounts, setSavedAmounts] = useState({});
  const [cancelledSubs, setCancelledSubs] = useState([]);
  const [upcomingSubs, setUpcomingSubs] = useState([]);

  useEffect(() => {
    const allSubs = getSubscriptions();
    const activeSubs = allSubs.filter(s => s.status !== 'cancelled');

    // Monthly totals per currency
    const mTotals = activeSubs.reduce((acc, sub) => {
      const monthly = getMonthlyEquivalent(sub.amount, sub.cycle);
      acc[sub.currency] = (acc[sub.currency] || 0) + monthly;
      return acc;
    }, {});
    setMonthlyTotals(mTotals);
    setActiveCount(activeSubs.length);

    // Most expensive active subscription
    if (activeSubs.length > 0) {
      const byMonthly = activeSubs.map(s => ({
        ...s,
        _monthly: getMonthlyEquivalent(s.amount, s.cycle),
      }));
      const top = byMonthly.reduce((a, b) => (a._monthly > b._monthly ? a : b));
      setMostExpensive(top);
    } else {
      setMostExpensive(null);
    }

    // Saved amounts from localStorage
    const savedStr = localStorage.getItem('savedAmounts');
    setSavedAmounts(savedStr ? JSON.parse(savedStr) : {});

    // Cancelled subscriptions
    setCancelledSubs(allSubs.filter(s => s.status === 'cancelled'));

    // Upcoming payments in next 30 days
    const upcoming = activeSubs
      .map(s => ({ ...s, _days: getDaysRemaining(s.renewalDate) }))
      .filter(s => s._days >= 0 && s._days <= 30)
      .sort((a, b) => a._days - b._days);
    setUpcomingSubs(upcoming);
  }, []);

  const hasSaved =
    savedAmounts && Object.keys(savedAmounts).length > 0;

  const totalSavedDisplay = hasSaved
    ? Object.entries(savedAmounts)
        .map(([currency, amount]) => formatCurrency(amount, currency))
        .join(' + ')
    : null;

  function getDayLabel(days) {
    if (days === 0) return 'Azi';
    if (days === 1) return 'Mâine';
    return `În ${days} zile`;
  }

  function getUrgencyColor(days) {
    if (days <= 3) return '#e05a5a';
    if (days <= 7) return '#c8a74a';
    return '#4a9e6d';
  }

  return (
    <div className="stats-page">
      {/* Header */}
      <header className="stats-header">
        <button className="stats-back-btn" onClick={() => navigate('/')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Înapoi
        </button>
        <span className="stats-header-title">Statistici</span>
      </header>

      <div className="stats-content">

        {/* 1. Hero Panel — Monthly spend */}
        <div className="stats-card stats-hero">
          <p className="stats-section-label">Cheltuieli lunare</p>
          {Object.keys(monthlyTotals).length === 0 ? (
            <p className="stats-empty">Niciun abonament activ.</p>
          ) : (
            Object.entries(monthlyTotals).map(([currency, amount]) => (
              <div key={currency} className="stats-hero-block">
                <span className="stats-hero-amount">
                  {formatCurrency(amount, currency)}
                </span>
                <span className="stats-hero-sub">
                  {activeCount} abonamente active
                </span>
                <span className="stats-hero-annual">
                  ≈ {formatCurrency(amount * 12, currency)} / an
                </span>
              </div>
            ))
          )}
        </div>

        {/* 2. Quick Insights Row */}
        <div className="stats-insights-row">
          {/* Most expensive */}
          <div className="stats-card stats-insight-card">
            <p className="stats-section-label">Cel mai scump</p>
            {mostExpensive ? (
              <>
                <span className="stats-insight-name">{mostExpensive.name}</span>
                <span className="stats-insight-value">
                  {formatCurrency(mostExpensive.amount, mostExpensive.currency)}
                  <span className="stats-insight-cycle">
                    /{mostExpensive.cycle === 'yearly' ? 'an' : 'lună'}
                  </span>
                </span>
              </>
            ) : (
              <span className="stats-empty">—</span>
            )}
          </div>

          {/* Savings */}
          <div className="stats-card stats-insight-card">
            <p className="stats-section-label">Economii</p>
            {hasSaved ? (
              <span className="stats-insight-value stats-insight-savings">
                {totalSavedDisplay}
              </span>
            ) : (
              <span className="stats-empty">—</span>
            )}
          </div>
        </div>

        {/* 3. Upcoming Payments Timeline */}
        <div className="stats-card">
          <p className="stats-section-label">Urmează curând</p>
          {upcomingSubs.length === 0 ? (
            <p className="stats-empty">Nicio plată în următoarele 30 de zile ✓</p>
          ) : (
            <div className="stats-timeline">
              {upcomingSubs.map(sub => (
                <div key={sub.id} className="stats-timeline-row">
                  <span
                    className="stats-dot"
                    style={{ background: getUrgencyColor(sub._days) }}
                  />
                  <span className="stats-timeline-name">{sub.name}</span>
                  <span className="stats-timeline-amount">
                    {formatCurrency(sub.amount, sub.currency)}
                  </span>
                  <span
                    className="stats-timeline-label"
                    style={{ color: getUrgencyColor(sub._days) }}
                  >
                    {getDayLabel(sub._days)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. Savings Card — only if savings exist */}
        {hasSaved && (
          <div className="stats-card stats-savings-card">
            <p className="stats-section-label">Bani economisiți</p>
            <span className="stats-savings-amount">{totalSavedDisplay}</span>
            <p className="stats-savings-desc">prin anularea abonamentelor</p>
          </div>
        )}

        {/* 5. Cancelled History */}
        <div className="stats-card">
          <p className="stats-section-label">Anulate</p>
          {cancelledSubs.length === 0 ? (
            <p className="stats-empty">Niciun abonament anulat încă.</p>
          ) : (
            <div className="stats-cancelled-list">
              {cancelledSubs.map(sub => (
                <div key={sub.id} className="stats-cancelled-row">
                  <span className="stats-cancelled-name">{sub.name}</span>
                  <span className="stats-cancelled-saving">
                    Economisești {formatCurrency(sub.amount, sub.currency)}/
                    {sub.cycle === 'yearly' ? 'an' : 'lună'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
