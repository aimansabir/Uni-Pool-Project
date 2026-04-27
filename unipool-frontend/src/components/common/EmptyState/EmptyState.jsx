import './EmptyState.css';

export default function EmptyState({
  icon = '📭',
  image,
  title = 'Nothing here yet',
  description,
  action,
}) {
  return (
    <div className="empty-state fade-in">
      {image ? (
        <img src={image} alt={title} className="empty-state__illustration" />
      ) : (
        <span className="empty-state__icon">{icon}</span>
      )}
      <h3 className="empty-state__title">{title}</h3>
      {description && <p className="empty-state__desc">{description}</p>}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  );
}
