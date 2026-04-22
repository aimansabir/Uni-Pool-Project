// IBA email domains allowed
export const IBA_EMAIL_DOMAINS = ['@iba.edu.pk', '@khi.iba.edu.pk'];

// Ride types
export const RIDE_TYPES = {
  SCHEDULED: 'SCHEDULED',
  INSTANT: 'INSTANT',
};

// Ride statuses
export const RIDE_STATUS = {
  PUBLISHED: 'PUBLISHED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

// Gender preferences
export const GENDER_PREFERENCE = {
  ANY: 'ANY',
  FEMALES_ONLY: 'FEMALES_ONLY',
};

// Genders
export const GENDERS = {
  MALE: 'male',
  FEMALE: 'female',
};

// Booking status
export const BOOKING_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
};

// Bottom nav items
export const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: 'home', path: '/dashboard' },
  { id: 'map', label: 'Map', icon: 'map', path: '/map' },
  { id: 'messages', label: 'Messages', icon: 'messages', path: '/messages' },
  { id: 'pooling', label: 'Pooling', icon: 'pooling', path: '/rides' },
  { id: 'profile', label: 'Profile', icon: 'profile', path: '/profile' },
];
