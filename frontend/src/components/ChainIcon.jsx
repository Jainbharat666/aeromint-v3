import React from 'react';
import rhLogo from '../assets/chains/robinhood.png';
import inkLogo from '../assets/chains/ink.png';

export default function ChainIcon({ chainKey, size = 18, className = '' }) {
  const s = size;
  
  switch (chainKey) {
    case 'robinhood':
    case 'robinhood_testnet':
      return (
        <img
          src={rhLogo}
          alt="Robinhood"
          width={s}
          height={s}
          className={className}
          style={{
            width: `${s}px`,
            height: `${s}px`,
            borderRadius: '4px',
            objectFit: 'contain',
            flexShrink: 0,
            display: 'inline-block',
            verticalAlign: 'middle'
          }}
        />
      );

    case 'ink':
      return (
        <img
          src={inkLogo}
          alt="Ink Chain"
          width={s}
          height={s}
          className={className}
          style={{
            width: `${s}px`,
            height: `${s}px`,
            borderRadius: '50%',
            objectFit: 'contain',
            flexShrink: 0,
            display: 'inline-block',
            verticalAlign: 'middle'
          }}
        />
      );

    case 'base':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className} style={{ flexShrink: 0, verticalAlign: 'middle' }}>
          <circle cx="12" cy="12" r="11" fill="#0052FF" fillOpacity="0.18" stroke="#0052FF" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="6" fill="#0052FF" />
        </svg>
      );

    case 'ethereum':
    default:
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className} style={{ flexShrink: 0, verticalAlign: 'middle' }}>
          <circle cx="12" cy="12" r="11" fill="#627EEA" fillOpacity="0.18" stroke="#627EEA" strokeWidth="1.5" />
          <path d="M12 4.5L6.5 12.5L12 15.5L17.5 12.5L12 4.5Z" fill="#627EEA" />
          <path d="M12 16.5L6.5 13.5L12 19.5L17.5 13.5L12 16.5Z" fill="#627EEA" fillOpacity="0.7" />
        </svg>
      );
  }
}

