import { IBA_EMAIL_DOMAINS } from './constants';

/**
 * Validate email is IBA domain
 */
export function isValidIbaEmail(email) {
  if (!email) return false;
  const lower = email.trim().toLowerCase();
  return IBA_EMAIL_DOMAINS.some((domain) => lower.endsWith(domain));
}

/**
 * Validate required field
 */
export function isRequired(value) {
  if (typeof value === 'string') return value.trim().length > 0;
  return value != null;
}

/**
 * Validate min length
 */
export function minLength(value, min) {
  return typeof value === 'string' && value.trim().length >= min;
}

/**
 * Validate a registration form
 */
export function validateRegisterForm(data) {
  const errors = {};

  if (!isRequired(data.fullName)) {
    errors.fullName = 'Full name is required.';
  }

  if (!isRequired(data.ibaEmail)) {
    errors.ibaEmail = 'IBA email is required.';
  } else if (!isValidIbaEmail(data.ibaEmail)) {
    errors.ibaEmail = 'Email must end with @iba.edu.pk or @khi.iba.edu.pk';
  }

  if (!isRequired(data.password)) {
    errors.password = 'Password is required.';
  } else if (!minLength(data.password, 6)) {
    errors.password = 'Password must be at least 6 characters.';
  }

  if (!isRequired(data.gender)) {
    errors.gender = 'Gender is required.';
  }

  return errors;
}

/**
 * Validate login form
 */
export function validateLoginForm(data) {
  const errors = {};

  if (!isRequired(data.ibaEmail)) {
    errors.ibaEmail = 'Email is required.';
  }

  if (!isRequired(data.password)) {
    errors.password = 'Password is required.';
  }

  return errors;
}

/**
 * Validate vehicle form
 */
export function validateVehicleForm(data) {
  const errors = {};

  if (!isRequired(data.ownerFullName)) errors.ownerFullName = 'Owner Full Name is required.';
  if (!isRequired(data.make)) errors.make = 'Car make is required.';
  if (!isRequired(data.model)) errors.model = 'Car model is required.';
  if (!isRequired(data.color)) errors.color = 'Color is required.';
  if (!isRequired(data.registrationNumber)) errors.registrationNumber = 'Registration number is required.';

  return errors;
}

/**
 * Validate publish ride form
 */
export function validatePublishRideForm(data) {
  const errors = {};

  if (!isRequired(data.vehicleId)) errors.vehicleId = 'Please select a vehicle.';
  if (!isRequired(data.startLocation)) errors.startLocation = 'Starting location is required.';
  if (!isRequired(data.destinationLocation)) errors.destinationLocation = 'Drop-off location is required.';
  if (!isRequired(data.rideType)) errors.rideType = 'Ride type is required.';

  if (data.seatsTotal == null || Number(data.seatsTotal) <= 0) {
    errors.seatsTotal = 'Number of available seats is required.';
  }

  if (data.rideType === 'SCHEDULED' && !isRequired(data.departureTime)) {
    errors.departureTime = 'Departure time is required for scheduled rides.';
  }

  return errors;
}

/**
 * Check if errors object is empty
 */
export function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}
