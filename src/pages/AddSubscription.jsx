import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PRESETS } from '../data/presets';
import { addSubscription, getSubscriptionById, updateSubscription } from '../utils/storage';
import { autoSync } from '../utils/storage';
import { generateId } from '../utils/helpers';
import ServiceLogo from '../components/ServiceLogo';
import './AddSubscription.css';

const CURRENCIES = ['RON', 'EUR'];
const CYCLES = ['monthly', 'yearly', 'custom'];
const REMINDER_OPTIONS = [7, 3, 1];

const PRESET_GRADIENTS = {
  'Netflix': 'linear-gradient(135deg, #E50914, #9b0610)',
  'Spotify': 'linear-gradient(135deg, #1DB954, #158f40)',
  'iCloud': 'linear-gradient(135deg, #1a73e8, #0d52b8)',
  'YouTube': 'linear-gradient(135deg, #FF0000, #bb0000)',
  'Disney+': 'linear-gradient(135deg, #1a1a8e, #0d0d60)',
  'HBO Max': 'linear-gradient(135deg, #5822c0, #3d148f)',
  'Adobe': 'linear-gradient(135deg, #FF0000, #cc0000)',
  'Deezer': 'linear-gradient(135deg, #ff0092, #cc006e)',
  'Gym': 'linear-gradient(135deg, #f0a500, #c8860a)',
  'Clinică': 'linear-gradient(135deg, #0ea5e9, #0284c7)',
  'Transport': 'linear-gradient(135deg, #6366f1, #4f46e5)',
  'Parcare': 'linear-gradient(135deg, #64748b, #475569)',
  'Default': 'linear-gradient(135deg, #21262d, #161b22)'
};

export default function AddSubscription() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  const [search, setSearch] = useState('');
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [name, setName] = useState('');
  const [logo, setLogo] = useState('➕');
  const [logoUrl, setLogoUrl] = useState(null);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('RON');
  const [renewalDate, setRenewalDate] = useState('');
  const [cycle, setCycle] = useState('monthly');
  const [intent, setIntent] = useState('renew');
  const [reminderDays, setReminderDays] = useState(3);
  const [cancelUrl, setCancelUrl] = useState('');
  const [category, setCategory] = useState('online');
  const isUtility = category === 'utilitati';
  const [showDateWarning, setShowDateWarning] = useState(false);

  useEffect(() => {
    if (editId) {
      const sub = getSubscriptionById(editId);
      if (sub) {
        setName(sub.name);
        setLogo(sub.logo);
        setLogoUrl(sub.logoUrl || null);
        setAmount(String(sub.amount));
        setCurrency(sub.currency);
        setRenewalDate(sub.renewalDate);
        setCycle(sub.cycle);
        setIntent(sub.intent);
        setReminderDays(sub.reminderDays);
        setCategory(sub.category || 'online');
        setCancelUrl(sub.cancelUrl || '');
        const preset = PRESETS.find((p) => p.name === sub.name);
        if (preset) setSelectedPreset(preset);
      }
    }

    const presetName = searchParams.get('preset');
    if (presetName && !editId) {
      const preset = PRESETS.find(p => p.name === presetName);
      if (preset) handlePresetSelect(preset);
    }
  }, [editId, searchParams]);

  const filteredPresets = search
    ? PRESETS.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : PRESETS;

  function handlePresetSelect(preset) {
    setSelectedPreset(preset);
    setName(preset.name);
    setLogo(preset.logo);
    setLogoUrl(preset.logoUrl || null);
    setAmount(String(preset.defaultAmount || ''));
    setCurrency(preset.defaultCurrency);
    setCycle(preset.defaultCycle);
    setCancelUrl(preset.cancelUrl || '');
    setCategory(preset.category || 'online');
  }

  function clearPreset() {
    setSelectedPreset(null);
    setName('');
    setLogo('➕');
    setLogoUrl(null);
    setAmount('');
    setCancelUrl('');
  }

  function handleSave() {
    if (!name.trim() || !amount || !renewalDate) return;

    const selectedDate = new Date(renewalDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      setShowDateWarning(true);
      return;
    }

    handleConfirmSave();
  }

  function handleConfirmSave() {
    const sub = {
      id: editId || generateId(),
      name: name.trim(),
      logo,
      logoUrl,
      amount: parseFloat(amount),
      currency,
      renewalDate,
      cycle,
      intent: isUtility ? 'renew' : intent,
      reminderDays,
      cancelUrl: cancelUrl || null,
      category: category,
      status: 'active',
      createdAt: editId
        ? getSubscriptionById(editId)?.createdAt || new Date().toISOString()
        : new Date().toISOString(),
    };

    if (editId) {
      updateSubscription(editId, sub);
    } else {
      addSubscription(sub);
    }

    autoSync();
    navigate('/');
  }

  return (
    <div className="add-page fade-in">
      <header className="add-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Înapoi
        </button>
        <h1 className="add-title">{editId ? 'Editează abonamentul' : 'Adaugă abonament'}</h1>
      </header>

      {!editId && !selectedPreset && (
        <>
          <input
            type="text"
            className="field-input search-input"
            placeholder="Caută Netflix, Spotify, sală..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="search-preset"
          />

          {!search && (
            <>
              <p className="preset-category-label">Online</p>
              <div className="preset-grid" id="preset-grid">
                {PRESETS.filter(p => p.category === 'online').map((p) => (
                  <button key={p.name} className="preset-card" onClick={() => handlePresetSelect(p)} style={{ background: PRESET_GRADIENTS[p.name] || PRESET_GRADIENTS['Default'] }}>
                    <div className="card-logo-wrap">
                      <ServiceLogo logoUrl={p.logoUrl} emoji={p.logo} name={p.name} size={30} />
                    </div>
                    <div>
                      <div className="card-name">{p.name}</div>
                      <div className="card-price">{p.defaultAmount} {p.defaultCurrency} / {p.defaultCycle === 'monthly' ? 'lună' : p.defaultCycle === 'yearly' ? 'an' : ''}</div>
                    </div>
                  </button>
                ))}
                <button className="preset-card" style={{ background: 'var(--card-bg)', border: '1px dashed #30363d' }} onClick={() => {
                  setSelectedPreset({ name: 'Personalizat', logo: '➕', logoUrl: null, category: 'online' });
                  setName('');
                  setLogo('➕');
                  setLogoUrl(null);
                  setCategory('online');
                }}>
                  <div className="card-logo-wrap" style={{ background: 'transparent' }}>
                    <ServiceLogo logoUrl={null} emoji={'➕'} name="Personalizat" size={30} />
                  </div>
                  <div>
                    <div className="card-name" style={{ color: 'var(--text-primary)' }}>+ Adaugă</div>
                    <div className="card-price" style={{ color: 'var(--text-secondary)' }}>personalizat</div>
                  </div>
                </button>
              </div>

              <p className="preset-category-label">Fizice</p>
              <div className="fizice-list">
                {PRESETS.filter(p => p.category === 'fizic').map((p) => (
                  <button key={p.name} className="fizic-row" onClick={() => handlePresetSelect(p)} style={{ background: PRESET_GRADIENTS[p.name] || PRESET_GRADIENTS['Default'] }}>
                    <div className="fizic-logo">{p.logo}</div>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div className="fizic-name">{p.name}</div>
                      <div className="fizic-sub">Abonament lunar</div>
                    </div>
                    <div className="fizic-price">{p.defaultAmount} {p.defaultCurrency}</div>
                  </button>
                ))}
              </div>
            </>
          )}

          {search && (
            <div className="fizice-list">
              {filteredPresets.map((p) => (
                <div key={p.name} className="search-result">
                  <div className="card-logo-wrap" style={{ background: 'transparent', width: '30px', height: '30px' }}>
                    <ServiceLogo logoUrl={p.logoUrl} emoji={p.logo} name={p.name} size={30} />
                  </div>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div className="fizic-name" style={{ color: 'var(--text-primary)' }}>{p.name}</div>
                    <div className="fizic-sub">{p.category === 'online' ? 'Online' : 'Fizic'} • {p.defaultAmount} {p.defaultCurrency}</div>
                  </div>
                  <button className="result-add" onClick={() => handlePresetSelect(p)}>Alege &rarr;</button>
                </div>
              ))}
              <div className="search-result" style={{ borderStyle: 'dashed' }}>
                <div className="fizic-logo" style={{ fontSize: '16px', background: 'transparent', border: '1px solid var(--border)' }}>➕</div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div className="fizic-name" style={{ color: 'var(--text-primary)' }}>Adaugă „{search}”</div>
                  <div className="fizic-sub">Personalizat</div>
                </div>
                <button className="result-add" onClick={() => {
                  setSelectedPreset({ name: search, logo: '➕', logoUrl: null, category: 'online' });
                  setName(search);
                  setLogo('➕');
                  setLogoUrl(null);
                  setCategory('online');
                }}>Alege &rarr;</button>
              </div>
            </div>
          )}
        </>
      )}

      {selectedPreset && !editId && (
        <div className="selected-preset-card">
          <span className="selected-emoji" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none' }}>
            <ServiceLogo logoUrl={selectedPreset.logoUrl} emoji={selectedPreset.logo} name={selectedPreset.name} size={32} />
          </span>
          <span className="selected-name">{selectedPreset.name}</span>
          <button className="change-link" onClick={clearPreset}>
            Schimbă
          </button>
        </div>
      )}

      {(selectedPreset || editId) && (
        <div className="add-form">
          {(selectedPreset || editId) && (
            <div className="field-group">
              <label className="field-label">Nume abonament</label>
              <input
                type="text"
                className="field-input"
                placeholder="ex. Abonamentul meu"
                value={name}
                onChange={(e) => setName(e.target.value)}
                id="input-name"
              />
            </div>
          )}

          <div className="field-group">
            <label className="field-label">Suma</label>
            <div className="amount-row">
              <input
                type="number"
                className="field-input amount-input"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
                inputMode="decimal"
                id="input-amount"
              />
              <div className="chip-group">
                {CURRENCIES.map((c) => (
                  <button
                    key={c}
                    className={`chip ${currency === c ? 'active' : ''}`}
                    onClick={() => setCurrency(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="field-group" id="renewal-date-field">
            <label className="field-label">{isUtility ? 'Data scadentă a facturii' : 'Data reînnoirii'}</label>
            <input
              type="date"
              className="field-input"
              value={renewalDate}
              onChange={(e) => setRenewalDate(e.target.value)}
              id="input-date"
            />
          </div>

          <div className="field-group">
            <label className="field-label">Ciclu de facturare</label>
            <div className="chip-group">
              {CYCLES.map((c) => {
                const cycleMap = { monthly: 'Lunar', yearly: 'Anual', custom: 'Personalizat' };
                return (
                  <button
                    key={c}
                    className={`chip ${cycle === c ? 'active' : ''}`}
                    onClick={() => setCycle(c)}
                  >
                    {cycleMap[c]}
                  </button>
                );
              })}
            </div>
          </div>

          {!isUtility && (
            <div className="field-group">
              <label className="field-label">Intenție</label>
              <div className="intent-toggle">
                <button
                  className={`intent-btn ${intent === 'renew' ? 'active renew' : ''}`}
                  onClick={() => setIntent('renew')}
                >
                  🔄 Vreau să reînnoiesc
                </button>
                <button
                  className={`intent-btn ${intent === 'cancel' ? 'active cancel' : ''}`}
                  onClick={() => setIntent('cancel')}
                >
                  ❌ Vreau să anulez
                </button>
              </div>
            </div>
          )}

          <div className="field-group">
            <label className="field-label">Amintește-mi cu</label>
            <div className="chip-group">
              {REMINDER_OPTIONS.map((d) => (
                <button
                  key={d}
                  className={`chip ${reminderDays === d ? 'active' : ''}`}
                  onClick={() => setReminderDays(d)}
                >
                  {d} zi{d > 1 ? 'le' : ''} înainte
                </button>
              ))}
            </div>
          </div>

          <button
            className="btn-primary save-btn"
            onClick={handleSave}
            disabled={!name.trim() || !amount || !renewalDate}
            id="btn-save"
          >
            {editId ? 'Salvează modificările' : 'Salvează abonamentul'}
          </button>
        </div>
      )}

      {showDateWarning && (
        <div className="confirm-overlay" onClick={() => setShowDateWarning(false)}>
          <div className="confirm-modal" onClick={e => e.stopPropagation()}>
            <h3>Dată în trecut</h3>
            <p>Data aleasă este în trecut. Abonamentul va apărea ca expirat. Continui?</p>
            <div className="confirm-actions">
              <button className="btn-secondary" onClick={() => setShowDateWarning(false)}>
                Anulează
              </button>
              <button className="btn-primary" onClick={handleConfirmSave}>
                Da, salvează
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
