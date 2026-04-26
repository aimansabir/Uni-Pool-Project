const prisma = require('../lib/prisma');

// ─── Helpers ────────────────────────────────────────────────────────

const createError = (message, statusCode) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const normalizeStars = (value, fieldName) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) {
    throw createError(`${fieldName} must be an integer between 1 and 5.`, 400);
  }

  return parsed;
};

const VALID_RATING_TYPES = ['PASSENGER_TO_DRIVER', 'DRIVER_TO_PASSENGER'];
const IMMUTABLE_RATING_FIELDS = ['rideId', 'bookingRequestId', 'raterId', 'rateeId', 'ratingType'];

const ensureValidRatingType = (ratingType) => {
  if (!VALID_RATING_TYPES.includes(ratingType)) {
    throw createError('Invalid rating type.', 400);
  }
};

const trimComment = (comment) => {
  if (comment == null) return null;
  if (typeof comment !== 'string') {
    throw createError('comment must be a string.', 400);
  }

  const trimmed = comment.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const buildRatingInclude = () => ({
  ride: {
    select: {
      id: true,
      status: true,
      driverId: true
    }
  },
  rater: {
    select: {
      id: true,
      fullName: true,
      ibaEmail: true
    }
  },
  ratee: {
    select: {
      id: true,
      fullName: true,
      ibaEmail: true
    }
  }
});

const ensureRatingViewerAccess = (rating, userId) => {
  if (!rating) {
    throw createError('Rating not found.', 404);
  }

  const isRater = rating.raterId === userId;
  const isRatee = rating.rateeId === userId;

  if (!isRater && !isRatee) {
    throw createError('You do not have permission to view this rating.', 403);
  }
};

const ensureRatingEditorAccess = (rating, userId) => {
  if (!rating) {
    throw createError('Rating not found.', 404);
  }

  if (rating.raterId !== userId) {
    throw createError('Only the original rater can modify this rating.', 403);
  }

  if (!rating.ride || rating.ride.status !== 'COMPLETED') {
    throw createError('Ratings can only be edited after ride completion.', 400);
  }
};

const buildRatingUpdateData = (ratingType, body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw createError('Request body must be a valid object.', 400);
  }

  for (const field of IMMUTABLE_RATING_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      throw createError(`${field} cannot be changed.`, 400);
    }
  }

  if (ratingType === 'PASSENGER_TO_DRIVER') {
    if (Object.prototype.hasOwnProperty.call(body, 'behaviorStars')) {
      throw createError('behaviorStars is not allowed for passenger-to-driver ratings.', 400);
    }

    if (
      !Object.prototype.hasOwnProperty.call(body, 'punctualityStars') ||
      !Object.prototype.hasOwnProperty.call(body, 'safetyStars')
    ) {
      throw createError('punctualityStars and safetyStars are required for passenger-to-driver rating updates.', 400);
    }

    return {
      punctualityStars: normalizeStars(body.punctualityStars, 'punctualityStars'),
      safetyStars: normalizeStars(body.safetyStars, 'safetyStars'),
      behaviorStars: null,
      comment: trimComment(body.comment)
    };
  }

  if (ratingType === 'DRIVER_TO_PASSENGER') {
    if (
      Object.prototype.hasOwnProperty.call(body, 'punctualityStars') ||
      Object.prototype.hasOwnProperty.call(body, 'safetyStars')
    ) {
      throw createError('punctualityStars and safetyStars are not allowed for driver-to-passenger ratings.', 400);
    }

    if (!Object.prototype.hasOwnProperty.call(body, 'behaviorStars')) {
      throw createError('behaviorStars is required for driver-to-passenger rating updates.', 400);
    }

    return {
      punctualityStars: null,
      safetyStars: null,
      behaviorStars: normalizeStars(body.behaviorStars, 'behaviorStars'),
      comment: trimComment(body.comment)
    };
  }

  throw createError('Invalid rating type.', 400);
};

// ─── CREATE: Passenger-to-Driver Rating ─────────────────────────────

const submitPassengerToDriverRating = async (
  rideId,
  bookingRequestId,
  passengerId,
  { punctualityStars, safetyStars, comment }
) => {
  const normalizedPunctualityStars = normalizeStars(punctualityStars, 'punctualityStars');
  const normalizedSafetyStars = normalizeStars(safetyStars, 'safetyStars');

  const ride = await prisma.ride.findUnique({
    where: { id: rideId },
    select: {
      id: true,
      driverId: true,
      status: true
    }
  });

  if (!ride) {
    throw createError('Ride not found.', 404);
  }

  const booking = await prisma.bookingRequest.findUnique({
    where: { id: bookingRequestId },
    select: {
      id: true,
      passengerId: true,
      rideId: true,
      status: true,
      participantStatus: true
    }
  });

  if (!booking) {
    throw createError('Booking request not found.', 404);
  }

  if (ride.status !== 'COMPLETED' && booking.participantStatus !== 'DROPPED_OFF') {
    throw createError('Ratings can only be submitted after passenger is dropped off or ride is completed.', 400);
  }

  if (booking.passengerId !== passengerId) {
    throw createError('This booking does not belong to you.', 403);
  }

  if (booking.rideId !== rideId) {
    throw createError('This booking does not belong to this ride.', 400);
  }

  if (booking.status !== 'ACCEPTED') {
    throw createError('Booking must be accepted to rate.', 400);
  }

  if (booking.participantStatus !== 'DROPPED_OFF' && ride.status !== 'COMPLETED') {
    throw createError('Only passengers who completed the ride can rate the driver.', 400);
  }

  const existing = await prisma.rideRating.findUnique({
    where: {
      rideId_raterId_rateeId_ratingType: {
        rideId,
        raterId: passengerId,
        rateeId: ride.driverId,
        ratingType: 'PASSENGER_TO_DRIVER'
      }
    }
  });

  if (existing) {
    throw createError('You have already rated the driver for this ride.', 409);
  }

  const rating = await prisma.rideRating.create({
    data: {
      rideId,
      bookingRequestId,
      raterId: passengerId,
      rateeId: ride.driverId,
      ratingType: 'PASSENGER_TO_DRIVER',
      punctualityStars: normalizedPunctualityStars,
      safetyStars: normalizedSafetyStars,
      comment: trimComment(comment)
    },
    include: buildRatingInclude()
  });

  await recalculateUserTrustScore(ride.driverId);

  return rating;
};

// ─── CREATE: Driver-to-Passenger Rating ─────────────────────────────

const submitDriverToPassengerRating = async (
  rideId,
  bookingRequestId,
  driverId,
  { behaviorStars, comment }
) => {
  const normalizedBehaviorStars = normalizeStars(behaviorStars, 'behaviorStars');

  const ride = await prisma.ride.findUnique({
    where: { id: rideId },
    select: {
      id: true,
      driverId: true,
      status: true
    }
  });

  if (!ride) {
    throw createError('Ride not found.', 404);
  }

  const booking = await prisma.bookingRequest.findUnique({
    where: { id: bookingRequestId },
    select: {
      id: true,
      passengerId: true,
      rideId: true,
      status: true,
      participantStatus: true
    }
  });

  if (!booking) {
    throw createError('Booking request not found.', 404);
  }

  if (ride.status !== 'COMPLETED' && booking.participantStatus !== 'DROPPED_OFF') {
    throw createError('Ratings can only be submitted after passenger is dropped off or ride is completed.', 400);
  }

  if (ride.driverId !== driverId) {
    throw createError('Only the ride driver can rate passengers.', 403);
  }

  if (booking.rideId !== rideId) {
    throw createError('This booking does not belong to this ride.', 400);
  }

  if (booking.status !== 'ACCEPTED') {
    throw createError('Booking must be accepted to rate.', 400);
  }

  if (booking.participantStatus !== 'DROPPED_OFF' && ride.status !== 'COMPLETED') {
    throw createError('Driver can only rate passengers who completed the ride.', 400);
  }

  const passengerId = booking.passengerId;

  const existing = await prisma.rideRating.findUnique({
    where: {
      rideId_raterId_rateeId_ratingType: {
        rideId,
        raterId: driverId,
        rateeId: passengerId,
        ratingType: 'DRIVER_TO_PASSENGER'
      }
    }
  });

  if (existing) {
    throw createError('You have already rated this passenger for this ride.', 409);
  }

  const rating = await prisma.rideRating.create({
    data: {
      rideId,
      bookingRequestId,
      raterId: driverId,
      rateeId: passengerId,
      ratingType: 'DRIVER_TO_PASSENGER',
      behaviorStars: normalizedBehaviorStars,
      comment: trimComment(comment)
    },
    include: buildRatingInclude()
  });

  await recalculateUserTrustScore(passengerId);

  return rating;
};

// ─── READ: List Ratings ─────────────────────────────────────────────

const listRatings = async (userId, query = {}) => {
  const { rideId, ratingType, as } = query;

  if (ratingType != null && ratingType !== '') {
    ensureValidRatingType(ratingType);
  }

  if (as != null && as !== '' && !['given', 'received', 'all'].includes(as)) {
    throw createError('Query parameter "as" must be one of: given, received, all.', 400);
  }

  const where = {};

  if (rideId) {
    where.rideId = rideId;
  }

  if (ratingType) {
    where.ratingType = ratingType;
  }

  if (as === 'given') {
    where.raterId = userId;
  } else if (as === 'received') {
    where.rateeId = userId;
  } else {
    where.OR = [
      { raterId: userId },
      { rateeId: userId }
    ];
  }

  const ratings = await prisma.rideRating.findMany({
    where,
    include: buildRatingInclude(),
    orderBy: { createdAt: 'desc' }
  });

  return {
    count: ratings.length,
    filters: {
      rideId: rideId || null,
      ratingType: ratingType || null,
      as: as || 'all'
    },
    ratings
  };
};

// ─── READ: Single Rating ────────────────────────────────────────────

const getRatingById = async (id, userId) => {
  const rating = await prisma.rideRating.findUnique({
    where: { id },
    include: buildRatingInclude()
  });

  ensureRatingViewerAccess(rating, userId);
  return rating;
};

// ─── UPDATE: Rating ─────────────────────────────────────────────────

const updateRating = async (id, userId, body) => {
  const existingRating = await prisma.rideRating.findUnique({
    where: { id },
    include: {
      ride: {
        select: {
          id: true,
          status: true
        }
      }
    }
  });

  ensureRatingEditorAccess(existingRating, userId);
  ensureValidRatingType(existingRating.ratingType);

  const updateData = buildRatingUpdateData(existingRating.ratingType, body);

  const updated = await prisma.rideRating.update({
    where: { id },
    data: updateData,
    include: buildRatingInclude()
  });

  await recalculateUserTrustScore(existingRating.rateeId);

  return updated;
};

// ─── DELETE: Rating ─────────────────────────────────────────────────

const deleteRating = async (id, userId) => {
  const existingRating = await prisma.rideRating.findUnique({
    where: { id }
  });

  if (!existingRating) {
    throw createError('Rating not found.', 404);
  }

  if (existingRating.raterId !== userId) {
    throw createError('Only the original rater can delete this rating.', 403);
  }

  const deleted = await prisma.rideRating.delete({
    where: { id }
  });

  await recalculateUserTrustScore(existingRating.rateeId);

  return {
    deleted: true,
    rating: deleted
  };
};

// ─── Trust Score Recalculation ──────────────────────────────────────

const recalculateUserTrustScore = async (userId) => {
  const ratings = await prisma.rideRating.findMany({
    where: { rateeId: userId },
    select: {
      punctualityStars: true,
      safetyStars: true,
      behaviorStars: true
    }
  });

  const punctualityRatings = ratings.filter((r) => r.punctualityStars != null);
  const safetyRatings = ratings.filter((r) => r.safetyStars != null);
  const behaviorRatings = ratings.filter((r) => r.behaviorStars != null);

  const punctualityAvg = punctualityRatings.length > 0
    ? punctualityRatings.reduce((sum, r) => sum + r.punctualityStars, 0) / punctualityRatings.length
    : null;

  const safetyAvg = safetyRatings.length > 0
    ? safetyRatings.reduce((sum, r) => sum + r.safetyStars, 0) / safetyRatings.length
    : null;

  const behaviorAvg = behaviorRatings.length > 0
    ? behaviorRatings.reduce((sum, r) => sum + r.behaviorStars, 0) / behaviorRatings.length
    : null;

  const punctualityScore = punctualityAvg != null ? Math.round((punctualityAvg / 5) * 100) : null;
  const safetyScore = safetyAvg != null ? Math.round((safetyAvg / 5) * 100) : null;
  const behaviorScore = behaviorAvg != null ? Math.round((behaviorAvg / 5) * 100) : null;

  const scores = [punctualityScore, safetyScore, behaviorScore].filter((score) => score != null);

  const trustScore = scores.length > 0
    ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
    : 100;

  await prisma.user.update({
    where: { id: userId },
    data: {
      punctualityScore,
      safetyScore,
      behaviorScore,
      trustScore,
      totalRatingsReceived: ratings.length
    }
  });
};

// ─── Public Trust Score ─────────────────────────────────────────────

const getUserTrustScore = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      trustScore: true,
      punctualityScore: true,
      safetyScore: true,
      behaviorScore: true,
      totalRatingsReceived: true
    }
  });

  if (!user) {
    throw createError('User not found.', 404);
  }

  return {
    id: user.id,
    fullName: user.fullName,
    trustScore: user.trustScore != null ? `${user.trustScore}%` : null,
    punctualityScore: user.punctualityScore != null ? `${user.punctualityScore}%` : null,
    safetyScore: user.safetyScore != null ? `${user.safetyScore}%` : null,
    behaviorScore: user.behaviorScore != null ? `${user.behaviorScore}%` : null,
    totalRatingsReceived: user.totalRatingsReceived
  };
};

module.exports = {
  submitPassengerToDriverRating,
  submitDriverToPassengerRating,
  listRatings,
  getRatingById,
  updateRating,
  deleteRating,
  recalculateUserTrustScore,
  getUserTrustScore
};