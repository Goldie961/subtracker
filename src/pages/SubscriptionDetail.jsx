import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSubscriptionById, deleteSubscription, updateSubscription } from '../utils/storage';
import { getDaysRemaining, getUrgencyClass, formatCurrency, formatDate } from '../utils/helpers';
import { PRESETS } from '../data/presets';
import ServiceLogo from '../components/ServiceLogo';
import './SubscriptionDetail.css';

export default function SubscriptionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showCancelSuccess, setShowCancelSuccess] = useState(false);
  const [showRenewSuccess, setShowRenewSuccess] = useState(false);

  const sub = getSubscriptionById(id);

  if (!sub) {
    return (
      <div className="detail-page fade-in">
        <button className="back-btn" onClick={() => navigate('/')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Înapoi
        </button>
        <div className="detail-not-found">
          <p>Abonamentul nu a fost găsit.</p>
        </div>
      </div>
    );
  }

  const days = getDaysRemaining(sub.renewalDate);
  const preset = PRESETS.find((p) => p.name === sub.name);
  const isUtility = sub.category === 'utilitati';
  const cancelGuide = preset?.cancelGuide || null;
  const cancelUrl = sub.cancelUrl || preset?.cancelUrl || null;

  function handleDelete() {
    deleteSubscription(id);
    navigate('/');
  }

  function handleMarkCancelled() {
    updateSubscription(id, { status: 'cancelled' });
    if (!isUtility) {
      const savedStr = localStorage.getItem('savedAmounts');
      const saved = savedStr ? JSON.parse(savedStr) : {};
      saved[sub.currency] = (saved[sub.currency] || 0) + sub.amount;
      localStorage.setItem('savedAmounts', JSON.stringify(saved));
    }
    setShowCancelSuccess(true);
    setTimeout(() => navigate('/'), 1500);
  }

  function handleMarkRenewed() {
    const d = new Date(sub.renewalDate);
    if (sub.cycle === 'monthly') {
      d.setMonth(d.getMonth() + 1);
    } else if (sub.cycle === 'yearly') {
      d.setFullYear(d.getFullYear() + 1);
    }
    
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const formattedDate = `${yyyy}-${mm}-${dd}`;

    updateSubscription(id, { renewalDate: formattedDate });
    setShowRenewSuccess(true);
    setTimeout(() => navigate('/'), 1500);
  }

  return (
    <div className="detail-page fade-in">
      <header className="detail-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Înapoi
        </button>
      </header>

      <div className="detail-hero">
        <div className="detail-logo-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none' }}>
          <ServiceLogo logoUrl={sub.logoUrl} emoji={sub.logo} name={sub.name} size={64} />
        </div>
        <h1 className="detail-name">{sub.name}</h1>
        <div className={`detail-badge ${getUrgencyClass(days)}`}>
          {days <= 0 
            ? (isUtility ? 'Restantă' : 'Expirat')
            : (isUtility ? `Scadentă în ${days} zile` : `${days} zile rămase`)
          }
        </div>
      </div>

      <div className="detail-card">
        <div className="detail-row">
          <span className="detail-label">Suma</span>
          <span className="detail-value">{formatCurrency(sub.amount, sub.currency)}</span>
        </div>
        <div className="detail-divider" />
        <div className="detail-row">
          <span className="detail-label">Ciclu de facturare</span>
          <span className="detail-value">{{ monthly: 'Lunar', yearly: 'Anual', custom: 'Personalizat' }[sub.cycle] || sub.cycle}</span>
        </div>
        <div className="detail-divider" />
        <div className="detail-row">
          <span className="detail-label">{isUtility ? 'Data scadentă' : 'Data reînnoirii'}</span>
          <span className="detail-value">{formatDate(sub.renewalDate)}</span>
        </div>
        {!isUtility && (
          <>
            <div className="detail-divider" />
            <div className="detail-row">
              <span className="detail-label">Intenție</span>
              <span className={`detail-value intent-value ${sub.intent}`}>
                {sub.intent === 'renew' ? '🔄 Reînnoiește' : '❌ Anulează'}
              </span>
            </div>
          </>
        )}
        <div className="detail-divider" />
        <div className="detail-row">
          <span className="detail-label">Memento</span>
          <span className="detail-value">cu {sub.reminderDays} zi{sub.reminderDays > 1 ? 'le' : ''} înainte</span>
        </div>
        <div className="detail-divider" />
        <div className="detail-row">
          <span className="detail-label">Adăugat la</span>
          <span className="detail-value">{formatDate(sub.createdAt)}</span>
        </div>
      </div>

      {!isUtility && cancelGuide && (
        <div className="cancel-guide-card">
          <h3 className="cancel-guide-title">📖 Cum să anulezi {sub.name}</h3>
          <p className="cancel-guide-text">{cancelGuide}</p>
        </div>
      )}

      {!isUtility && cancelUrl && (
        <a
          href={cancelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="cancel-url-btn"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2px',
            width: '100%',
            marginBottom: '12px',
            padding: '14px 16px',
            borderRadius: '8px',
            textDecoration: 'none',
            ...(sub.intent === 'cancel'
              ? { backgroundColor: '#2ea043', color: '#fff', border: 'none' }
              : { backgroundColor: 'transparent', color: '#8b949e', border: '1px solid #30363d' }
            )
          }}
          id="btn-cancel-url"
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '15px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
            {sub.intent === 'cancel' ? `Reînnoiește pe site-ul ${sub.name}` : `Anulează pe site-ul ${sub.name}`}
            <span style={{ fontSize: '13px' }}>↗</span>
          </span>
          <span style={{ fontSize: '11px', color: '#8b949e', marginTop: '2px' }}>
            Vei fi redirecționat către pagina comerciantului
          </span>
        </a>
      )}

      <button
        className="btn-secondary"
        style={{
          width: '100%',
          marginBottom: '24px',
          backgroundColor: '#161b22',
          borderColor: '#30363d',
          color: (sub.intent === 'renew' ? showRenewSuccess : showCancelSuccess) ? '#3fb950' : '#c9d1d9',
        }}
        onClick={sub.intent === 'renew' ? handleMarkRenewed : handleMarkCancelled}
        disabled={sub.intent === 'renew' ? showRenewSuccess : showCancelSuccess}
      >
        {sub.intent === 'renew' 
          ? (showRenewSuccess ? 'Reînnoit! Data actualizată 🎉' : '✓ Marchează ca reînnoit')
          : (showCancelSuccess ? (isUtility ? 'Factură marcată ca plătită! ✓' : `Ai economisit ${sub.amount} ${sub.currency}! 🎉`) : (isUtility ? '✓ Marchează ca plătit' : '✓ Marchează ca anulat'))}
      </button>

      <div className="detail-actions">
        <button
          className="btn-secondary"
          style={{ flex: 1 }}
          onClick={() => navigate(`/add?edit=${sub.id}`)}
          id="btn-edit"
        >
          ✏️ Editează
        </button>
        <button
          className="btn-danger"
          style={{ flex: 1 }}
          onClick={() => setShowConfirm(true)}
          id="btn-delete"
        >
          🗑️ Șterge
        </button>
      </div>

      {showConfirm && (
        <div className="confirm-overlay" onClick={() => setShowConfirm(false)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Ștergi abonamentul?</h3>
            <p>Ești sigur că vrei să ștergi <strong>{sub.name}</strong>? Această acțiune nu poate fi anulată.</p>
            <div className="confirm-actions">
              <button className="btn-secondary" onClick={() => setShowConfirm(false)}>
                Păstrează
              </button>
              <button className="btn-danger" onClick={handleDelete}>
                Da, șterge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
