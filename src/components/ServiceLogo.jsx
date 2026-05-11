import { useState } from 'react';

export default function ServiceLogo({ logoUrl, emoji, name, size = 40 }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      style={{
        width: size,
        height: size,
        backgroundColor: '#21262d',
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {logoUrl && !imgError ? (
        <img
          src={logoUrl}
          alt={`${name} logo`}
          style={{
            width: '75%',
            height: '75%',
            objectFit: 'contain',
            borderRadius: 4,
          }}
          onError={() => setImgError(true)}
        />
      ) : (
        <span style={{ fontSize: size * 0.6 }}>{emoji}</span>
      )}
    </div>
  );
}
