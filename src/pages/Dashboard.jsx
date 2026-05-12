import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSubscriptions } from '../utils/storage';
import { autoSync } from '../utils/storage';
import { PRESETS } from '../data/presets';
import {
  getDaysRemaining,
  getUrgencyClass,
  formatCurrency,
  formatDate,
} from '../utils/helpers';
import ServiceLogo from '../components/ServiceLogo';
import './Dashboard.css';

export default function Dashboard() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [reminderChips, setReminderChips] = useState(() => {
    const saved = localStorage.getItem('reminderDays');
    return saved ? JSON.parse(saved) : [3, 1];
  });
  const [notifActive, setNotifActive] = useState(() => {
    try { return Notification.permission === 'granted'; } catch { return false; }
  });

  const getLogoUrl = (sub) => 
    sub.logoUrl || PRESETS.find(p => p.name === sub.name)?.logoUrl || null;

  const [dismissedBanners, setDismissedBanners] = useState(() => {
    const str = localStorage.getItem('dismissedBanners');
    return str ? JSON.parse(str) : {};
  });
  const [openCategories, setOpenCategories] = useState({
    online: true,
    fizic: true,
  });
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);
  const navigate = useNavigate();
  const syncTimeoutRef = useRef(null);

  const loadData = () => {
    setSubscriptions(getSubscriptions());
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleDismissStrip = (e, subId) => {
    e.stopPropagation();
    const updated = { ...dismissedBanners, [subId]: Date.now() };
    setDismissedBanners(updated);
    localStorage.setItem('dismissedBanners', JSON.stringify(updated));
  };

  const toggleCategory = (cat) => {
    setOpenCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setShowInstall(false);
  };

  function handleChipToggle(day) {
    setReminderChips(prev => {
      const next = prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day];
      localStorage.setItem('reminderDays', JSON.stringify(next));
      // debounced sync to Redis
      clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(async () => {
        try {
          const registration = await navigator.serviceWorker.ready;
          const pushSub = await registration.pushManager.getSubscription();
          if (!pushSub) return;
          await fetch('/api/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subscription: pushSub,
              subscriptions: getSubscriptions(),
              reminderDays: next
            })
          });
        } catch {}
      }, 800);
      return next;
    });
  }

  const activeSubs = subscriptions.filter(sub => sub.status !== 'cancelled');
  const now = Date.now();

  // Reminder strips: expired (days<=0) or urgent (days<=reminderDays), not dismissed
  const reminderSubs = activeSubs
    .filter(sub => {
      const days = getDaysRemaining(sub.renewalDate);
      const isReminder = days <= (sub.reminderDays || 7);
      const isDismissed = dismissedBanners[sub.id] && (now - dismissedBanners[sub.id] < 24 * 60 * 60 * 1000);
      return isReminder && !isDismissed;
    })
    .sort((a, b) => {
      const dA = getDaysRemaining(a.renewalDate);
      const dB = getDaysRemaining(b.renewalDate);
      // expired first (days<=0), then ascending
      if (dA <= 0 && dB > 0) return -1;
      if (dA > 0 && dB <= 0) return 1;
      return dA - dB;
    });

  const nonUrgentSubs = activeSubs;

  const categoryConfig = {
    online: { icon: '🌐', bg: '#0d2018', label: 'Online' },
    fizic: { icon: '🏃', bg: '#170b1f', label: 'Fizice' },
    other: { icon: '📁', bg: '#161b22', label: 'Altele' }
  };

  const getSubsByCategory = (cat) =>
    nonUrgentSubs
      .filter(sub => sub.category === cat)
      .sort((a, b) => getDaysRemaining(a.renewalDate) - getDaysRemaining(b.renewalDate));

  const uncategorized = nonUrgentSubs.filter(
    sub => !sub.category || !['online', 'utilitati', 'fizic'].includes(sub.category)
  );

  const sortedCategories = ['online', 'fizic'].sort((a, b) => {
    const subsA = getSubsByCategory(a);
    const subsB = getSubsByCategory(b);
    if (subsA.length === 0) return 1;
    if (subsB.length === 0) return -1;
    const minA = Math.min(...subsA.map(s => getDaysRemaining(s.renewalDate)));
    const minB = Math.min(...subsB.map(s => getDaysRemaining(s.renewalDate)));
    return minA - minB;
  });

  const nextNotif = activeSubs
    .filter(s => s.renewalDate)
    .map(s => ({ ...s, daysLeft: getDaysRemaining(s.renewalDate) }))
    .filter(s => s.daysLeft >= 0 && reminderChips.includes(s.daysLeft))
    .sort((a, b) => a.daysLeft - b.daysLeft)[0] || null;

  if (activeSubs.length === 0) {
    return (
      <div className="dashboard fade-in">
        <header className="dash-header">
          <h1 className="dash-greeting">Salut 👋</h1>
          <div className="dash-header-actions">
            <button className="btn-icon" id="btn-notifications" onClick={() => { setShowNotifPanel(true); autoSync(); }}>🔔</button>
            <button className="btn-icon" id="btn-settings" onClick={() => navigate('/settings')}>⚙️</button>
          </div>
        </header>
        <div className="empty-state">
          <div className="empty-emoji">📋</div>
          <h2>Niciun abonament încă</h2>
          <p>Adaugă primul abonament ca să urmărești reînnoirile și să economisești bani.</p>
          <button
            className="btn-primary"
            id="btn-add-first"
            onClick={() => navigate('/add')}
          >
            + Adaugă abonament
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard fade-in">
      <header className="dash-header">
        <h1 className="dash-greeting">Salut 👋</h1>
        <div className="dash-header-actions">
          <button className="btn-icon" id="btn-notifications" onClick={() => { setShowNotifPanel(true); autoSync(); }}>🔔</button>
          <button className="btn-icon" id="btn-statistics" onClick={() => navigate('/statistics')}>📊</button>
          <button className="btn-icon" id="btn-settings" onClick={() => navigate('/settings')}>⚙️</button>
        </div>
      </header>

      {reminderSubs.length > 0 && (
        <div className="reminder-strips-card">
          <div className="reminder-strips-card-header">
            <span className="reminder-strips-card-dot"></span>
            <span className="reminder-strips-card-title">Scadente apropiate</span>
          </div>
          <div className="reminder-strips-card-body">
            {reminderSubs.map((sub, i) => {
              const days = getDaysRemaining(sub.renewalDate);
              const stripType = days <= 0 ? 'expired' : days <= 3 ? 'urgent' : 'upcoming';
              return (
                <div
                  key={sub.id}
                  className={`reminder-strip reminder-strip--${stripType}`}
                  style={{ animationDelay: `${i * 60}ms` }}
                  onClick={() => navigate(`/subscription/${sub.id}`)}
                >
                  <span className="reminder-strip__logo">
                    <ServiceLogo logoUrl={getLogoUrl(sub)} emoji={sub.logo} name={sub.name} size={28} />
                  </span>
                  <span className="reminder-strip__name">{sub.name}</span>
                  <span className="reminder-strip__days">
                    {days <= 0 ? 'Expirat' : `${days}z`}
                  </span>
                  <span className="reminder-strip__amount">
                    {formatCurrency(sub.amount, sub.currency)}
                  </span>
                  <button
                    className="reminder-strip__dismiss"
                    onClick={(e) => handleDismissStrip(e, sub.id)}
                    aria-label="Dismiss"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="categories-list">

        {sortedCategories.map((key) => {
          const subs = getSubsByCategory(key);
          if (subs.length === 0) return null;
          const isOpen = openCategories[key];
          const conf = categoryConfig[key];

          const minDays = Math.min(...subs.map(s => getDaysRemaining(s.renewalDate)));
          const dotClass = minDays <= 3 ? 'dot-red' : (minDays <= 7 ? 'dot-yellow' : '');

          const totalMonthly = Math.round(subs.reduce((acc, s) => {
            return acc + (s.cycle === 'yearly' ? s.amount / 12 : s.amount);
          }, 0));

          const nextUrgencyClass = minDays <= 3 ? 'text-red' : (minDays <= 7 ? 'text-yellow' : 'text-green');

          return (
            <div key={key} className={`category-group ${isOpen ? 'open' : ''}`}>
              <button
                className="category-header"
                onClick={() => toggleCategory(key)}
              >
                <div className="category-icon-wrap" style={{ background: conf.bg }}>{conf.icon}</div>
                <div className="category-header-info">
                  <div className="category-header-row1">
                    <span className="category-title">{conf.label}</span>
                    {dotClass && <span className={`category-dot ${dotClass}`}></span>}
                  </div>
                  <div className="category-header-row2">
                    {subs.length} {subs.length === 1 ? 'abonament' : 'abonamente'} · {totalMonthly} RON/lună
                  </div>
                </div>
                <div className="category-next">
                  <span className="category-next-label">Următor</span>
                  <span className={`category-next-value ${nextUrgencyClass}`}>
                    {minDays <= 0 ? 'Expirat' : `${minDays}z`}
                  </span>
                </div>
                <span className={`category-arrow ${isOpen ? 'open' : ''}`}>›</span>
              </button>
              {isOpen && (
                <div className="category-subs">
                  {subs.map((sub, i) => {
                    const days = getDaysRemaining(sub.renewalDate);
                    return (
                      <div
                        key={sub.id}
                        className={`sub-row ${getUrgencyClass(days)}`}
                        style={{ animationDelay: `${i * 50}ms` }}
                        onClick={() => navigate(`/subscription/${sub.id}`)}
                      >
                        <span className="sub-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none' }}>
                          <ServiceLogo logoUrl={getLogoUrl(sub)} emoji={sub.logo} name={sub.name} size={36} />
                        </span>
                        <div className="sub-info">
                          <span className="sub-name">{sub.name}</span>
                          {(() => {
                            const days2 = getDaysRemaining(sub.renewalDate);
                            const isDismissed = dismissedBanners[sub.id] &&
                              (Date.now() - dismissedBanners[sub.id] < 24 * 60 * 60 * 1000);
                            if (!isDismissed) return null;
                            if (days2 <= 0) return <span className="sub-urgent-badge sub-urgent-badge--expired">expirat</span>;
                            if (days2 <= sub.reminderDays) return <span className="sub-urgent-badge sub-urgent-badge--urgent">{days2}z · urgent</span>;
                            return null;
                          })()}
                          <span className="sub-date">{formatDate(sub.renewalDate)}</span>
                        </div>
                        <span className="sub-amount">{formatCurrency(sub.amount, sub.currency)}</span>
                        <span className={`sub-days ${days <= 0 ? 'expired' : ''}`}>
                          {days <= 0 ? 'Expirat' : `${days}z`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {uncategorized.length > 0 && (() => {
          const key = 'other';
          const subs = uncategorized;
          const isOpen = openCategories[key];
          const conf = categoryConfig[key];

          const minDays = Math.min(...subs.map(s => getDaysRemaining(s.renewalDate)));
          const dotClass = minDays <= 3 ? 'dot-red' : (minDays <= 7 ? 'dot-yellow' : '');

          const totalMonthly = Math.round(subs.reduce((acc, s) => {
            return acc + (s.cycle === 'yearly' ? s.amount / 12 : s.amount);
          }, 0));

          const nextUrgencyClass = minDays <= 3 ? 'text-red' : (minDays <= 7 ? 'text-yellow' : 'text-green');

          return (
            <div className={`category-group ${isOpen ? 'open' : ''}`}>
              <button className="category-header" onClick={() => toggleCategory(key)}>
                <div className="category-icon-wrap" style={{ background: conf.bg }}>{conf.icon}</div>
                <div className="category-header-info">
                  <div className="category-header-row1">
                    <span className="category-title">{conf.label}</span>
                    {dotClass && <span className={`category-dot ${dotClass}`}></span>}
                  </div>
                  <div className="category-header-row2">
                    {subs.length} {subs.length === 1 ? 'abonament' : 'abonamente'} · {totalMonthly} RON/lună
                  </div>
                </div>
                <div className="category-next">
                  <span className="category-next-label">Următor</span>
                  <span className={`category-next-value ${nextUrgencyClass}`}>
                    {minDays <= 0 ? 'Expirat' : `${minDays}z`}
                  </span>
                </div>
                <span className={`category-arrow ${isOpen ? 'open' : ''}`}>›</span>
              </button>
              {isOpen && (
                <div className="category-subs">
                  {subs.map((sub, i) => {
                    const days = getDaysRemaining(sub.renewalDate);
                    return (
                      <div
                        key={sub.id}
                        className={`sub-row ${getUrgencyClass(days)}`}
                        style={{ animationDelay: `${i * 50}ms` }}
                        onClick={() => navigate(`/subscription/${sub.id}`)}
                      >
                        <span className="sub-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none' }}>
                          <ServiceLogo logoUrl={getLogoUrl(sub)} emoji={sub.logo} name={sub.name} size={36} />
                        </span>
                        <div className="sub-info">
                          <span className="sub-name">{sub.name}</span>
                          {(() => {
                            const days2 = getDaysRemaining(sub.renewalDate);
                            const isDismissed = dismissedBanners[sub.id] &&
                              (Date.now() - dismissedBanners[sub.id] < 24 * 60 * 60 * 1000);
                            if (!isDismissed) return null;
                            if (days2 <= 0) return <span className="sub-urgent-badge sub-urgent-badge--expired">expirat</span>;
                            if (days2 <= sub.reminderDays) return <span className="sub-urgent-badge sub-urgent-badge--urgent">{days2}z · urgent</span>;
                            return null;
                          })()}
                          <span className="sub-date">{formatDate(sub.renewalDate)}</span>
                        </div>
                        <span className="sub-amount">{formatCurrency(sub.amount, sub.currency)}</span>
                        <span className={`sub-days ${days <= 0 ? 'expired' : ''}`}>
                          {days <= 0 ? 'Expirat' : `${days}z`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      <div className="bottom-bar">
        {showInstall && (
          <button onClick={handleInstall} style={{
            width: '100%',
            padding: '10px 14px',
            background: 'transparent',
            border: '1px solid rgba(0,200,150,0.4)',
            borderRadius: 10,
            color: '#00c896',
            fontWeight: 500,
            fontSize: 13,
            cursor: 'pointer',
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            letterSpacing: 0.2
          }}>
            <span style={{ fontSize: 15 }}>📲</span>
            Instalează aplicația
          </button>
        )}
        <button
          className="btn-primary bottom-add-btn"
          id="btn-add-subscription"
          onClick={() => navigate('/add')}
        >
          + Adaugă abonament
        </button>
      </div>


      {showNotifPanel && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'flex-end',
          }}
          onClick={() => setShowNotifPanel(false)}
        >
          <div
            style={{
              background: '#0d1117',
              borderRadius: '20px 20px 0 0',
              width: '100%',
              maxHeight: '82vh',
              overflowY: 'auto',
              padding: '12px 16px 36px',
              boxShadow: '0 -4px 32px rgba(0,0,0,0.5)',
              animation: 'notifSlideUp 0.28s cubic-bezier(0.32,0.72,0,1) both',
            }}
            onClick={e => e.stopPropagation()}
          >
            <style>{`
              @keyframes notifSlideUp {
                from { transform: translateY(100%); }
                to   { transform: translateY(0); }
              }
            `}</style>

            {/* Handle bar */}
            <div style={{
              width: 36,
              height: 4,
              background: '#30363d',
              borderRadius: 2,
              margin: '0 auto 12px',
            }} />

            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              paddingBottom: 14,
              borderBottom: '1px solid #21262d',
              marginBottom: 16,
            }}>
              <span style={{ fontWeight: 700, fontSize: 17, color: '#c9d1d9', flex: 1 }}>Notificări</span>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '3px 10px',
                borderRadius: 20,
                background: notifActive ? 'rgba(63,185,80,0.12)' : 'rgba(139,148,158,0.10)',
                border: notifActive ? '1px solid rgba(63,185,80,0.3)' : '1px solid rgba(139,148,158,0.2)',
                color: notifActive ? '#3fb950' : '#8b949e',
                fontSize: 12,
                fontWeight: 600,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: notifActive ? '#3fb950' : '#8b949e', display: 'inline-block' }} />
                {notifActive ? 'Activ' : 'Inactiv'}
              </span>
            </div>

            {/* Chips section */}
            <p style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.8px',
              color: '#484f58',
              textTransform: 'uppercase',
              marginBottom: 12,
            }}>
              Anunță-mă înainte cu:
            </p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              {[7, 3, 1, 0].map(day => (
                <button
                  key={day}
                  onClick={() => handleChipToggle(day)}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 20,
                    border: reminderChips.includes(day)
                      ? '1px solid #58a6ff'
                      : '1px solid #30363d',
                    background: reminderChips.includes(day)
                      ? 'rgba(88,166,255,0.18)'
                      : '#161b22',
                    color: reminderChips.includes(day) ? '#58a6ff' : '#8b949e',
                    fontSize: 14,
                    cursor: 'pointer',
                    fontWeight: reminderChips.includes(day) ? 600 : 400,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {day === 0 ? 'În ziua plății' : day === 1 ? '1 zi' : `${day} zile`}
                </button>
              ))}
            </div>

            {/* Active subscriptions section */}
            <p style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.8px',
              color: '#484f58',
              textTransform: 'uppercase',
              marginBottom: 12,
            }}>
              Abonamente active:
            </p>
            <div style={{ marginBottom: 16 }}>
              {activeSubs
                .filter(s => s.renewalDate)
                .map(s => ({ ...s, daysLeft: getDaysRemaining(s.renewalDate) }))
                .sort((a, b) => a.daysLeft - b.daysLeft)
                .map(s => {
                  const daysColor = s.daysLeft <= 1 ? '#f85149'
                    : s.daysLeft <= 3 ? '#f0883e'
                    : s.daysLeft <= 7 ? '#d29922'
                    : '#3fb950';
                  const daysLabel = s.daysLeft <= 0 ? 'Azi'
                    : s.daysLeft === 1 ? 'Mâine'
                    : `${s.daysLeft}z`;
                  return (
                    <div key={s.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px 0',
                      borderBottom: '1px solid #21262d',
                      gap: 8,
                    }}>
                      <span style={{ fontSize: 18 }}>{s.logo}</span>
                      <span style={{ flex: 1, color: '#c9d1d9', fontSize: 14 }}>{s.name}</span>
                      <span style={{ fontSize: 12, color: '#484f58' }}>{formatDate(s.renewalDate)}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: daysColor, minWidth: 42, textAlign: 'right' }}>
                        {daysLabel}
                      </span>
                    </div>
                  );
                })
              }
            </div>

            {/* Next notification card */}
            {nextNotif && (
              <div style={{
                background: '#161b22',
                border: '1px solid #21262d',
                borderRadius: 10,
                padding: '12px 14px',
                marginBottom: 8,
              }}>
                <p style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.8px',
                  color: '#484f58',
                  textTransform: 'uppercase',
                  marginBottom: 6,
                }}>
                  Următoarea notificare:
                </p>
                <p style={{ fontSize: 14, color: '#c9d1d9', fontWeight: 700, margin: 0 }}>
                  {nextNotif.name} — {nextNotif.daysLeft === 0 ? 'azi' : nextNotif.daysLeft === 1 ? 'mâine' : `în ${nextNotif.daysLeft} zile`}
                </p>
              </div>
            )}

            {/* Footer */}
            <p style={{ fontSize: 11, color: '#484f58', textAlign: 'center', marginTop: 8 }}>
              Sincronizare automată la deschidere
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
