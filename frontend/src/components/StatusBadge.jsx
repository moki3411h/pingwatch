export default function StatusBadge({ up }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: '999px',
      fontSize: '12px',
      fontWeight: 600,
      background: up ? '#14532d' : '#450a0a',
      color: up ? '#22c55e' : '#ef4444',
    }}>
      {up ? 'UP' : 'DOWN'}
    </span>
  );
}
