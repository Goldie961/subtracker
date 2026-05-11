import './SubMascot.css';

export default function SubMascot({ state = 'idle', size = 52 }) {
  return (
    <div className={`sub-mascot-wrap state-${state}`} style={{ width: size, height: size }}>
      <svg className="sub-mascot-svg" width="100%" height="100%" viewBox="0 0 100 100">
        <defs>
          <radialGradient id="grad-main" cx="35%" cy="25%" r="65%">
            <stop offset="0%" stopColor="#00e8ac" />
            <stop offset="100%" stopColor="#007a5e" />
          </radialGradient>
          <radialGradient id="grad-glow" cx="50%" cy="50%" r="50%">
            <stop offset="70%" stopColor="rgba(0,200,150,0.5)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        
        {/* Glow exterior */}
        <circle className="sub-glow" cx="50" cy="50" r="48" fill="url(#grad-glow)" />
        
        {/* Cerc principal */}
        <circle cx="50" cy="50" r="40" fill="url(#grad-main)" />
        
        {/* Highlight intern */}
        <ellipse cx="38" cy="32" rx="14" ry="7" fill="#ffffff" opacity="0.12" transform="rotate(-30 38 32)" />

        {/* Ochi */}
        {state === 'sleeping' ? (
          <g>
            <line x1="34" y1="50" x2="44" y2="50" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="56" y1="50" x2="66" y2="50" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        ) : (
          <g>
            {/* Ochi stanga */}
            <g className="sub-eye" style={{ transformOrigin: '39px 50px' }}>
              <circle cx="39" cy="50" r="4.5" fill="#ffffff" />
              <circle cx="39" cy="50" r="1.8" fill="#0d1117" />
              <circle cx="38.2" cy="49.2" r="0.8" fill="#ffffff" />
            </g>
            {/* Ochi dreapta */}
            <g className="sub-eye" style={{ transformOrigin: '61px 50px' }}>
              <circle cx="61" cy="50" r="4.5" fill="#ffffff" />
              <circle cx="61" cy="50" r="1.8" fill="#0d1117" />
              <circle cx="60.2" cy="49.2" r="0.8" fill="#ffffff" />
            </g>
          </g>
        )}
      </svg>
    </div>
  );
}
