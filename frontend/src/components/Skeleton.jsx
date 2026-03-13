import React from 'react';

export function SkeletonCard({ height = 200 }) {
  return (
    <div 
      className="skeleton-card loading-shimmer" 
      style={{ 
        height,
        borderRadius: 'var(--radius-xl)',
        background: 'linear-gradient(135deg, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.02) 100%)',
      }}
    />
  );
}

export function SkeletonText({ width = '100%', height = 16 }) {
  return (
    <div 
      className="skeleton-text loading-shimmer"
      style={{ 
        width, 
        height, 
        borderRadius: 4,
        background: 'rgba(0,0,0,0.06)',
      }}
    />
  );
}

export function SkeletonPriceCard() {
  return (
    <div 
      className="skeleton-price-card loading-shimmer"
      style={{
        minHeight: 130,
        borderRadius: 'var(--radius-lg)',
        background: 'linear-gradient(135deg, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.02) 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: 20,
      }}
    >
      <SkeletonText width={60} height={14} />
      <SkeletonText width={80} height={32} />
      <SkeletonText width={50} height={12} />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div 
        className="loading-shimmer" 
        style={{ 
          height: 48, 
          borderRadius: 8, 
          background: 'rgba(0,0,0,0.06)' 
        }} 
      />
      {Array.from({ length: rows }).map((_, i) => (
        <div 
          key={i}
          className="loading-shimmer" 
          style={{ 
            height: 56, 
            borderRadius: 8, 
            background: 'rgba(0,0,0,0.03)',
            animationDelay: `${i * 0.1}s`,
          }} 
        />
      ))}
    </div>
  );
}

export default function Skeleton({ type = 'card', ...props }) {
  switch (type) {
    case 'text':
      return <SkeletonText {...props} />;
    case 'price':
      return <SkeletonPriceCard {...props} />;
    case 'table':
      return <SkeletonTable {...props} />;
    default:
      return <SkeletonCard {...props} />;
  }
}
