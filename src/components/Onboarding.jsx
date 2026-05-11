import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import SubMascot from './SubMascot';
import './Onboarding.css';

// ── Typewriter ──────────────────────────────────────────────
const Typewriter = ({ text }) => {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    setDisplayed('');
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(iv);
    }, 28);
    return () => clearInterval(iv);
  }, [text]);
  return <>{displayed}</>;
};

// ── Spotlight ───────────────────────────────────────────────
const Spotlight = ({ rect }) => {
  if (!rect) return null;
  const pad = 10;
  const top = Math.max(0, rect.top - pad);
  const left = Math.max(0, rect.left - pad);
  const width = rect.width + pad * 2;
  const height = rect.height + pad * 2;
  const W = window.innerWidth;
  const H = window.innerHeight;

  const clipPath = `polygon(
    0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
    ${left}px ${top}px,
    ${left}px ${top + height}px,
    ${left + width}px ${top + height}px,
    ${left + width}px ${top}px,
    ${left}px ${top}px
  )`;

  return (
    <>
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.82)',
        clipPath: clipPath,
        zIndex: 1000,
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'fixed',
        inset: 0,
        clipPath: clipPath,
        zIndex: 1000,
        pointerEvents: 'all',
      }} onClick={e => e.stopPropagation()} />
      <div style={{
        position: 'fixed',
        top: top,
        left: left,
        width: width,
        height: height,
        borderRadius: 14,
        border: '2px solid #00c896',
        boxShadow: '0 0 0 4px rgba(0,200,150,0.15)',
        zIndex: 1001,
        pointerEvents: 'none',
      }} />
    </>
  );
};

// ── Helpers ─────────────────────────────────────────────────
function getRect(id) {
  const el = document.getElementById(id);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function mascotStyle(rect, step) {
  if (!rect) return { position: 'fixed', bottom: 120, left: 24 };
  if (step === 2) {
    return {
      position: 'fixed',
      bottom: Math.max(20, window.innerHeight - rect.top + 12),
      left: Math.max(16, rect.left),
    };
  }
  if (step === 3) {
    return {
      position: 'fixed',
      top: Math.max(8, rect.top - 75),
      left: rect.left,
    };
  }
  if (step === 4 || step === 5) {
    return {
      position: 'fixed',
      bottom: window.innerHeight - rect.top + 12,
      left: Math.max(16, rect.left),
    };
  }
  if (step === 6) {
    return {
      position: 'fixed',
      bottom: Math.max(20, window.innerHeight - rect.top + 12),
      left: Math.max(16, rect.left),
    };
  }
  return { position: 'fixed', bottom: 120, left: 24 };
}

// ── Main ────────────────────────────────────────────────────
export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(1);
  const [rect, setRect] = useState(null);
  const [amountConfirmed, setAmountConfirmed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const finish = useCallback(() => {
    localStorage.setItem('onboardingComplete', 'true');
    navigate('/');
    onComplete();
  }, [onComplete]);

  const finishRef = useRef(finish);
  useEffect(() => { finishRef.current = finish; }, [finish]);

  useEffect(() => {
    if (step === 3) setAmountConfirmed(false);
  }, [step]);

  // PAS 2 — spotlight pe butonul Add, click pe buton avanseaza
  useEffect(() => {
    if (step !== 2) return;
    const btnId = document.getElementById('btn-add-subscription')
      ? 'btn-add-subscription'
      : 'btn-add-first';
    setRect(getRect(btnId));
  }, [step]);

  // PAS 3 — navigate la /add, spotlight pe primul card, click preset avanseaza
  useEffect(() => {
    if (step !== 3) return;
    navigate('/add');
    let t1, t2, t3;
    
    const tryFind = () => {
      const firstCard = document.querySelector('#preset-grid .preset-card');
      if (firstCard) {
        setRect(firstCard.getBoundingClientRect());
        return true;
      }
      return false;
    };

    t1 = setTimeout(() => {
      if (!tryFind()) {
        t2 = setTimeout(() => {
          if (!tryFind()) {
            t3 = setTimeout(tryFind, 800);
          }
        }, 500);
      }
    }, 300);

    return () => { 
      clearTimeout(t1); 
      clearTimeout(t2); 
      clearTimeout(t3); 
    };
  }, [step, navigate]);

  // PAS 4 — monitorizare location.pathname
  useEffect(() => {
    if ([4, 5, 6].includes(step) && location.pathname === '/') {
      setStep(7);
    }
  }, [location.pathname, step]);

  // PAS 4 — Spotlight pe input-amount
  useEffect(() => {
    if (step !== 4) return;
    const tryFind = () => { 
      const r = getRect('input-amount'); 
      if (r) { setRect(r); return true; } 
      return false; 
    };
    const t = setTimeout(() => { if(!tryFind()) setTimeout(tryFind, 400); }, 200);
    
    const handlePointerDown = (e) => {
      const el = document.getElementById('input-amount');
      if (el && e.target !== el && el.value && el.value.trim() !== '') {
        setAmountConfirmed(true);
        setTimeout(() => setStep(5), 900);
      }
    };
    
    const handleFocusIn = (e) => {
      const el = document.getElementById('input-amount');
      if (e.target.id !== 'input-amount' && el && el.value && el.value.trim() !== '') {
        setAmountConfirmed(true);
        setTimeout(() => setStep(5), 900);
      }
    };
    
    // Așteptăm puțin ca elementul să fie în DOM
    const attachTimer = setTimeout(() => {
      document.addEventListener('pointerdown', handlePointerDown);
      document.addEventListener('focusin', handleFocusIn);
    }, 300);
    
    return () => { 
      clearTimeout(t); 
      clearTimeout(attachTimer);
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('focusin', handleFocusIn);
    };
  }, [step]);

  // PAS 5 — Spotlight pe input-date
  useEffect(() => {
    if (step !== 5) return;
    const tryFind = () => { 
      const r = getRect('renewal-date-field'); 
      if (r) { setRect(r); return true; } 
      return false; 
    };
    const t = setTimeout(() => { if(!tryFind()) setTimeout(tryFind, 400); }, 200);
    
    const handleChange = () => {
      const el = document.getElementById('input-date') || document.querySelector('input[type="date"]');
      if (el && el.value && el.value.trim() !== '') {
        setStep(6);
      }
    };

    const handlePointerUp = () => {
      setTimeout(() => {
        const el = document.getElementById('input-date') || document.querySelector('input[type="date"]');
        if (el && el.value && el.value.trim() !== '') {
          setStep(6);
        }
      }, 300);
    };

    let attachedElements = [];
    let observer = null;
    let pollInterval = null;
    
    const attachTimer = setTimeout(() => {
      const els = [
        document.getElementById('renewal-date-field'),
        document.getElementById('input-date'),
        document.querySelector('input[type="date"]')
      ].filter(Boolean);
      
      els.forEach(el => {
        el.addEventListener('change', handleChange);
        el.addEventListener('input', handleChange);
        if (!attachedElements.includes(el)) {
          attachedElements.push(el);
        }
      });

      document.addEventListener('pointerup', handlePointerUp);

      const dateEl = document.getElementById('input-date') || document.querySelector('input[type="date"]');
      if (dateEl) {
        observer = new MutationObserver(() => {
          if (dateEl.value && dateEl.value.trim() !== '') setStep(6);
        });
        observer.observe(dateEl, { attributes: true, attributeFilter: ['value'] });
      }

      pollInterval = setInterval(() => {
        const el = document.getElementById('input-date') || document.querySelector('input[type="date"]');
        if (el && el.value && el.value.trim() !== '') {
          clearInterval(pollInterval);
          setStep(6);
        }
      }, 500);
    }, 300);
    
    return () => { 
      clearTimeout(t); 
      clearTimeout(attachTimer);
      attachedElements.forEach(el => {
        el.removeEventListener('change', handleChange);
        el.removeEventListener('input', handleChange);
      });
      document.removeEventListener('pointerup', handlePointerUp);
      if (observer) observer.disconnect();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [step]);

  // PAS 6 — Spotlight pe btn-save
  useEffect(() => {
    if (step !== 6) return;
    const tryFind = () => {
      const el = document.getElementById('btn-save');
      if (!el) return false;
      // Scroll the button into view first
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Wait for scroll animation to finish, then get rect
      setTimeout(() => {
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      }, 600);
      return true;
    };
    const t = setTimeout(() => { if (!tryFind()) setTimeout(tryFind, 400); }, 200);
    return () => clearTimeout(t);
  }, [step]);

  // PAS 7 — success, auto-finish dupa 2.5s
  useEffect(() => {
    if (step !== 7) return;
    setRect(null);
    const t = setTimeout(() => finishRef.current(), 2500);
    return () => clearTimeout(t);
  }, [step]);

  // Resize
  useEffect(() => {
    const onResize = () => {
      if (step === 2) {
        const btnId = document.getElementById('btn-add-subscription') 
          ? 'btn-add-subscription' 
          : 'btn-add-first';
        setRect(getRect(btnId));
      }
      if (step === 3) {
        const firstCard = document.querySelector('#preset-grid .preset-card');
        if (firstCard) setRect(firstCard.getBoundingClientRect());
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [step]);

  return (
    <div 
      className={`onboarding-overlay step-${step}`}
      style={[4,5,7].includes(step) ? { pointerEvents: 'none' } : {}}
    >

      <button 
        className="onboarding-skip" 
        style={{ position: 'fixed', top: 48, right: 20, zIndex: 1002, pointerEvents: 'all' }} 
        onClick={finish}
      >
        Skip
      </button>

      {step >= 2 && step <= 3 && (
        <div className="onboarding-dots">
          {[2, 3].map(d => (
            <div key={d} className={`onboarding-dot ${d === step ? 'active' : ''}`} />
          ))}
        </div>
      )}

      {step >= 2 && step <= 6 && <Spotlight rect={rect} />}

      {step === 2 && rect && (
        <button
          style={{
            position: 'fixed',
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            zIndex: 1002,
            borderRadius: 14,
          }}
          onClick={() => setStep(3)}
        />
      )}

      {step === 3 && rect && (
        <button
          style={{
            position: 'fixed',
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            zIndex: 1002,
            borderRadius: 14,
          }}
          onClick={() => {
            const firstCard = document.querySelector('#preset-grid .preset-card');
            if (firstCard) firstCard.click();
            setTimeout(() => setStep(4), 200);
          }}
        />
      )}

      {step === 6 && rect && (
        <button
          style={{
            position: 'fixed',
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            zIndex: 1003,
            borderRadius: 12,
            pointerEvents: 'all',
          }}
          onClick={() => {
            document.getElementById('btn-save')?.click();
          }}
        />
      )}

      {step === 1 && (
        <div className="onboarding-step-1" style={{ pointerEvents: 'all' }}>
          <SubMascot size={80} state="idle" />
          <div className="onboarding-brand">SUBTRACKER</div>
          <p className="onboarding-text-main">
            Salut. Sunt <span className="sub-accent">Sub</span>.<br />
            Îți amintesc înainte să te<br />
            coste uitarea.
          </p>
          <button className="btn-primary start-btn" onClick={() => setStep(2)}>
            Hai să începem
          </button>
          <button className="btn-skip-text" onClick={finish}>
            Sari peste
          </button>
        </div>
      )}

      {step === 7 && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
          zIndex: 1003,
          pointerEvents: 'none',
        }}>
          <div className="confetti-container">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="confetti-particle"
                style={{
                  '--left': `${5 + Math.random() * 90}%`,
                  '--animation-duration': `${1.2 + Math.random() * 1.5}s`,
                  '--animation-delay': `${Math.random() * 0.5}s`,
                  backgroundColor: i % 3 === 0 ? '#00c896' : i % 3 === 1 ? '#ffffff' : '#00e8ac',
                }}
              />
            ))}
          </div>
          <div style={{
            background: '#161b22',
            border: '1px solid #21262d',
            borderRadius: 20,
            padding: '24px 32px',
            textAlign: 'center',
            maxWidth: 320,
            width: '90%',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <div style={{ marginBottom: 8 }}>
                <SubMascot size={52} state="sleeping" />
              </div>
            </div>
            <div style={{
              width: 48, height: 48,
              borderRadius: '50%',
              background: 'rgba(0,200,150,0.12)',
              border: '1px solid rgba(0,200,150,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke="#00c896" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
              Abonament adăugat!
            </div>
            <div style={{ fontSize: 13, color: '#8b949e', lineHeight: 1.5 }}>
              Te anunț cu 3 zile înainte să fii taxat.
            </div>
            <div style={{ fontSize: 12, color: '#00c896', marginTop: 12, fontWeight: 500 }}>
              Revin doar când contează.
            </div>
          </div>
        </div>
      )}

      {step >= 2 && step <= 6 && (
        <div className="onboarding-mascot-fixed" style={{ ...mascotStyle(rect, step), zIndex: 1002 }}>
          <SubMascot size={52} state="talking" />
          <div className="onboarding-bubble" style={[4,5,6].includes(step) ? { pointerEvents: 'none' } : {}}>
            {step === 2 && <Typewriter key={2} text="Poți începe de aici." />}
            {step === 3 && <Typewriter key={3} text="Apasă pe Netflix ca să începem." />}
            {step === 4 && (
              amountConfirmed 
                ? <span style={{ color: '#00c896', fontWeight: 600 }}>✓ Sumă confirmată!</span>
                : <Typewriter key={4} text="Verifică sau modifică suma, apoi click în altă parte." />
            )}
            {step === 5 && <Typewriter key={5} text="Acum setează data reînnoirii." />}
            {step === 6 && <Typewriter key={6} text="Gata! Apasă să salvezi." />}
          </div>
        </div>
      )}

    </div>
  );
}
