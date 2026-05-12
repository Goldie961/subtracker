import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSubscriptions } from '../utils/storage';
import { getDaysRemaining, formatDate, formatCurrency } from '../utils/helpers';
import ServiceLogo from '../components/ServiceLogo';
import { PRESETS } from '../data/presets';
import './NotifPanel.css';

export default function NotifPanel({ activeSubs, onClose }) {
  const navigate = useNavigate();

  const [reminderChips, setReminderChips] = useState(() => {
    const saved = localStorage.getItem('reminderDays');
    return saved ? JSON.parse(saved) : [3, 1];
  });
  const [notifActive, setNotifActive] = useState(() => {
    const stored = localStorage.getItem('notifActive');
    if (stored === 'false') return false;
    try { return Notification.permission === 'granted'; } catch { return false; }
  });
  const [openAccordion, setOpenAccordion] = useState(null);
  const [remindOnDay, setRemindOnDay] = useState(() => {
    return localStorage.getItem('remindOnDay') === 'true';
  });
  const [remindAfterRenew, setRemindAfterRenew] = useState(() => {
    return localStorage.getItem('remindAfterRenew') === 'true';
  });

  const syncTimeoutRef = useRef(null);

  const getLogoUrl = (sub) =>
    sub.logoUrl || PRESETS.find(p => p.name === sub.name)?.logoUrl || null;

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
      setNotifActive(false);
      localStorage.setItem('notifActive', 'false');
    } catch (err) {
      console.error('Error disabling notifications:', err);
    }
  };

  return (
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
      onClick={onClose}
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
          {notifActive && (
            <button
              onClick={handleDisableNotifications}
              style={{
                background: 'rgba(248,81,73,0.08)',
                border: '1px solid rgba(248,81,73,0.25)',
                color: '#f85149',
                borderRadius: 6,
                padding: '4px 10px',
                fontSize: 12,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Dezactivează
            </button>
          )}
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

        {/* Scheduled notifications list */}
        <p style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.8px',
          color: '#484f58',
          textTransform: 'uppercase',
          marginBottom: 12,
        }}>
          Notificări programate:
        </p>
        <div style={{ marginBottom: 16 }}>
          {(() => {
            const maxChip = reminderChips.length > 0 ? Math.max(...reminderChips) : 0;
            const notifSubs = activeSubs
              .filter(s => s.renewalDate)
              .map(s => ({ ...s, daysLeft: getDaysRemaining(s.renewalDate) }))
              .filter(s => s.daysLeft <= maxChip)
              .sort((a, b) => a.daysLeft - b.daysLeft);

            if (notifSubs.length === 0) {
              return (
                <p style={{ fontSize: 12, color: '#484f58', margin: 0 }}>
                  Nicio notificare programată
                </p>
              );
            }

            return notifSubs.map(sub => {
              const dl = sub.daysLeft;
              let badgeBg, badgeBorder, badgeColor, badgeLabel;
              if (dl <= 0) {
                badgeBg = 'rgba(248,81,73,0.12)'; badgeBorder = 'rgba(248,81,73,0.3)'; badgeColor = '#f85149'; badgeLabel = 'Expirat';
              } else if (dl === 1) {
                badgeBg = 'rgba(240,165,0,0.12)'; badgeBorder = 'rgba(240,165,0,0.3)'; badgeColor = '#f0a500'; badgeLabel = 'Mâine';
              } else if (dl <= 2) {
                badgeBg = 'rgba(240,165,0,0.12)'; badgeBorder = 'rgba(240,165,0,0.3)'; badgeColor = '#f0a500'; badgeLabel = `${dl} zile`;
              } else {
                badgeBg = 'rgba(63,185,80,0.12)'; badgeBorder = 'rgba(63,185,80,0.3)'; badgeColor = '#3fb950';
                badgeLabel = dl === 0 ? 'Azi' : `${dl} zile`;
              }

              const isOpen = openAccordion === sub.id;

              return (
                <div key={sub.id}>
                  {/* Row */}
                  <div
                    onClick={() => setOpenAccordion(prev => prev === sub.id ? null : sub.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 0',
                      borderBottom: '1px solid #21262d',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontSize: 18, flexShrink: 0 }}>
                      <ServiceLogo logoUrl={getLogoUrl(sub)} emoji={sub.logo} name={sub.name} size={22} />
                    </span>
                    <span style={{ flex: 1, color: '#c9d1d9', fontSize: 14, fontWeight: 600 }}>{sub.name}</span>
                    <span style={{ fontSize: 11, color: '#484f58' }}>{formatDate(sub.renewalDate)}</span>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: badgeBg,
                      border: `1px solid ${badgeBorder}`,
                      color: badgeColor,
                    }}>
                      {badgeLabel}
                    </span>
                  </div>

                  {/* Accordion */}
                  <div style={{
                    overflow: 'hidden',
                    transition: 'max-height 0.2s ease',
                    maxHeight: isOpen ? '120px' : '0px',
                  }}>
                    <div style={{
                      background: '#161b22',
                      borderRadius: 10,
                      padding: '10px 12px',
                      margin: '2px 0 6px',
                      border: '1px solid #21262d',
                    }}>
                      <p style={{ fontSize: 12, color: '#8b949e', marginBottom: 8, marginTop: 0 }}>
                        Vrei să anulezi notificarea anticipat?
                      </p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => { onClose(); navigate(`/subscription/${sub.id}`); }}
                          style={{
                            flex: 1,
                            padding: '7px 0',
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            background: 'rgba(63,185,80,0.12)',
                            border: '1px solid rgba(63,185,80,0.3)',
                            color: '#3fb950',
                          }}
                        >
                          ✓ Da, am înțeles
                        </button>
                        <button
                          onClick={() => setOpenAccordion(null)}
                          style={{
                            flex: 1,
                            padding: '7px 0',
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            background: 'rgba(248,81,73,0.08)',
                            border: '1px solid rgba(248,81,73,0.25)',
                            color: '#f85149',
                          }}
                        >
                          ✗ Nu
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            });
          })()}
        </div>

        {/* Global toggles */}
        <div style={{ borderTop: '1px solid #21262d', paddingTop: 4 }}>
          {/* Toggle: Reamintește în ziua reînnoirii */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 0',
            borderBottom: '1px solid #21262d',
          }}>
            <span style={{ fontSize: 13, color: '#c9d1d9' }}>Reamintește în ziua reînnoirii</span>
            <div
              onClick={() => {
                const val = !remindOnDay;
                setRemindOnDay(val);
                localStorage.setItem('remindOnDay', val);
              }}
              style={{
                position: 'relative',
                width: 38,
                height: 20,
                borderRadius: 10,
                background: remindOnDay ? '#238636' : '#30363d',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'background 0.2s ease',
              }}
            >
              <div style={{
                position: 'absolute',
                top: 2,
                left: remindOnDay ? 20 : 2,
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: '#fff',
                transition: 'left 0.2s ease',
              }} />
            </div>
          </div>

          {/* Toggle: Notificare după reînnoire */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 0',
            borderBottom: '1px solid #21262d',
          }}>
            <span style={{ fontSize: 13, color: '#c9d1d9' }}>Notificare după reînnoire</span>
            <div
              onClick={() => {
                const val = !remindAfterRenew;
                setRemindAfterRenew(val);
                localStorage.setItem('remindAfterRenew', val);
              }}
              style={{
                position: 'relative',
                width: 38,
                height: 20,
                borderRadius: 10,
                background: remindAfterRenew ? '#238636' : '#30363d',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'background 0.2s ease',
              }}
            >
              <div style={{
                position: 'absolute',
                top: 2,
                left: remindAfterRenew ? 20 : 2,
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: '#fff',
                transition: 'left 0.2s ease',
              }} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
