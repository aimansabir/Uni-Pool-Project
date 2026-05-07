import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import unipoolTop from '../../assets/images/Unipool Top.png';
import screen1 from '../../assets/images/Screen 1.png';
import screen2 from '../../assets/images/screen 2.png';
import screen3 from '../../assets/images/screen 3.png';
import './OnboardingPage.css';

const slides = [
  {
    image: screen1,
    title: 'Reduce Cost',
    description: 'Join the carpooling community and save time and money on your daily commute',
  },
  {
    image: screen2,
    title: 'Save Environment',
    description: 'Reduce your carbon footprint and help to reduce traffic congestion',
  },
  {
    image: screen3,
    title: 'Stress Free Commute',
    description: 'Enjoy a stress-free commute with real-time carpool tracking and notifications',
  },
];

export default function OnboardingPage() {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();

  // Auto-swipe every 3.5 seconds
  const goNext = useCallback(() => {
    setCurrent((prev) => (prev + 1) % slides.length);
  }, []);

  useEffect(() => {
    const interval = setInterval(goNext, 3500);
    return () => clearInterval(interval);
  }, [goNext]);

  const goToSlide = (index) => setCurrent(index);

  return (
    <div className="onboarding-page">
      {/* Top Logo */}
      <div className="onboarding-page__logo">
        <img src={unipoolTop} alt="Unipool" className="onboarding-page__logo-img" />
      </div>

      {/* Carousel */}
      <div className="onboarding-page__carousel">
        <div
          className="onboarding-page__track"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {slides.map((slide, i) => (
            <div className="onboarding-page__slide" key={i}>
              <div className="onboarding-page__illustration">
                <img src={slide.image} alt={slide.title} />
              </div>
              <h2 className="onboarding-page__title">{slide.title}</h2>
              <p className="onboarding-page__desc">{slide.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Dot Indicators */}
      <div className="onboarding-page__dots">
        {slides.map((_, i) => (
          <button
            key={i}
            className={`onboarding-page__dot ${i === current ? 'onboarding-page__dot--active' : ''}`}
            onClick={() => goToSlide(i)}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>

      {/* Buttons */}
      <div className="onboarding-page__actions">
        <button
          className="onboarding-page__btn onboarding-page__btn--login"
          onClick={() => navigate('/login')}
        >
          Log in
        </button>
        <button
          className="onboarding-page__btn onboarding-page__btn--signup"
          onClick={() => navigate('/register')}
        >
          Sign up
        </button>
      </div>
    </div>
  );
}
