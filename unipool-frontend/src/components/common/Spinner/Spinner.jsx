import './Spinner.css';

export default function Spinner({ size = 32, color, className = '' }) {
  return (
    <div className={`spinner-container ${className}`}>
      <div
        className="spinner"
        style={{
          width: size,
          height: size,
          borderColor: color || 'var(--color-primary-light)',
          borderTopColor: color || 'var(--color-primary)',
        }}
      />
    </div>
  );
}

export function FullPageSpinner() {
  return (
    <div className="full-page-spinner">
      <Spinner size={40} />
    </div>
  );
}
