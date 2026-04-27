import { useState } from 'react';
import './RideCards.css';

export default function RatingStars({ value = 0, onChange, readonly = false }) {
  const [hoverValue, setHoverValue] = useState(0);
  const stars = [1, 2, 3, 4, 5];

  return (
    <div className={`rating-stars ${readonly ? 'readonly' : ''}`}>
      {stars.map((star) => (
        <span
          key={star}
          className={`star ${(hoverValue || value) >= star ? 'filled' : ''}`}
          onClick={() => !readonly && onChange?.(star)}
          onMouseEnter={() => !readonly && setHoverValue(star)}
          onMouseLeave={() => !readonly && setHoverValue(0)}
        >
          ★
        </span>
      ))}
    </div>
  );
}
