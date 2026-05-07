const prisma = require('../lib/prisma');

const createError = (msg, code = 400) => {
  const err = new Error(msg);
  err.statusCode = code;
  return err;
};

/**
 * Get or create the conversation between driver and passenger for a ride.
 * Only allowed if there is an ACCEPTED booking between them.
 */
const getOrCreateConversation = async ({ rideId, currentUserId }) => {
  // Find any accepted booking for this ride where current user is driver or passenger
  const ride = await prisma.ride.findUnique({
    where: { id: rideId },
    select: { id: true, driverId: true },
  });
  if (!ride) throw createError('Ride not found.', 404);

  const isDriver = ride.driverId === currentUserId;

  if (isDriver) {
    // Driver: needs to pick a passenger — return all conversations for this ride
    throw createError('Drivers must use listConversations; use bookingRequestId to open a specific chat.', 400);
  }

  // Passenger: find their accepted booking on this ride
  const booking = await prisma.bookingRequest.findFirst({
    where: {
      rideId,
      passengerId: currentUserId,
      status: { in: ['PENDING', 'ACCEPTED'] },
    },
    select: { id: true },
  });
  if (!booking) throw createError('You do not have an active booking on this ride.', 403);

  return getOrCreateConversationByBooking({ bookingRequestId: booking.id, currentUserId });
};

/**
 * Get or create a conversation given a specific bookingRequestId.
 * Only the driver and passenger of that booking may access it.
 */
const getOrCreateConversationByBooking = async ({ bookingRequestId, currentUserId }) => {
  const booking = await prisma.bookingRequest.findUnique({
    where: { id: bookingRequestId },
    include: {
      ride: { select: { id: true, driverId: true } },
    },
  });
  if (!booking) throw createError('Booking not found.', 404);

  const isDriver = booking.ride.driverId === currentUserId;
  const isPassenger = booking.passengerId === currentUserId;
  if (!isDriver && !isPassenger) throw createError('You are not part of this booking.', 403);

  // Upsert conversation
  const existing = await prisma.conversation.findUnique({
    where: { bookingRequestId },
  });
  if (existing) return existing;

  return prisma.conversation.create({
    data: {
      rideId: booking.ride.id,
      bookingRequestId,
      driverId: booking.ride.driverId,
      passengerId: booking.passengerId,
    },
  });
};

/**
 * List all conversations the current user participates in,
 * with the latest message and unread count.
 */
const listConversations = async (currentUserId) => {
  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [
        { driverId: currentUserId },
        { passengerId: currentUserId },
      ],
    },
    include: {
      ride: {
        select: {
          id: true,
          startLocation: true,
          destinationLocation: true,
          departureTime: true,
          rideType: true,
        },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  // For each conversation, resolve the other participant's name
  const enriched = await Promise.all(
    conversations.map(async (conv) => {
      const otherUserId = conv.driverId === currentUserId ? conv.passengerId : conv.driverId;
      const otherUser = await prisma.user.findUnique({
        where: { id: otherUserId },
        select: { id: true, fullName: true, gender: true, avatarUrl: true },
      });

      // Count unread messages not sent by current user
      const unreadCount = await prisma.message.count({
        where: {
          conversationId: conv.id,
          senderId: { not: currentUserId },
          readAt: null,
        },
      });

      const latestMessage = conv.messages[0] || null;

      return {
        id: conv.id,
        rideId: conv.rideId,
        bookingRequestId: conv.bookingRequestId,
        otherUser,
        ride: conv.ride,
        latestMessage,
        unreadCount,
        updatedAt: conv.updatedAt,
      };
    })
  );

  return enriched;
};

/**
 * Fetch all messages in a conversation (oldest first).
 * Marks all unread messages (not sent by viewer) as read.
 */
const getMessages = async ({ conversationId, currentUserId }) => {
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { driverId: true, passengerId: true },
  });
  if (!conv) throw createError('Conversation not found.', 404);

  const isParticipant = conv.driverId === currentUserId || conv.passengerId === currentUserId;
  if (!isParticipant) throw createError('You are not part of this conversation.', 403);

  // Mark unread messages as read
  await prisma.message.updateMany({
    where: {
      conversationId,
      senderId: { not: currentUserId },
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  return prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      senderId: true,
      body: true,
      readAt: true,
      createdAt: true,
    },
  });
};

/**
 * Send a message in a conversation.
 */
const sendMessage = async ({ conversationId, senderId, body }) => {
  if (!body || !body.trim()) throw createError('Message body cannot be empty.', 400);

  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { driverId: true, passengerId: true },
  });
  if (!conv) throw createError('Conversation not found.', 404);

  const isParticipant = conv.driverId === senderId || conv.passengerId === senderId;
  if (!isParticipant) throw createError('You are not part of this conversation.', 403);

  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: { conversationId, senderId, body: body.trim() },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    }),
  ]);

  return message;
};

module.exports = {
  getOrCreateConversationByBooking,
  getOrCreateConversation,
  listConversations,
  getMessages,
  sendMessage,
};
