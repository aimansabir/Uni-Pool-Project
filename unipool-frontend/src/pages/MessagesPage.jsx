import './SharedPages.css';

export default function MessagesPage() {
  return (
    <div className="messages-page fade-in">
      <div className="coming-soon">
        <span className="coming-soon__icon">💬</span>
        <h2 className="coming-soon__title">Messages</h2>
        <p className="coming-soon__desc">
          In-app messaging is coming soon.<br />
          You'll be able to chat with your carpool members here.
        </p>
        <div className="coming-soon__badge">Coming Soon</div>
      </div>
    </div>
  );
}
