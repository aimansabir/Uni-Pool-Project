const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const notificationService = require('./notification.service');

const register = async ({ fullName, ibaEmail, password, phone, studentErp, gender }) => {
  if (!fullName || !ibaEmail || !password || !gender) {
    const err = new Error('Full name, email, password, and gender are required.');
    err.statusCode = 400;
    throw err;
  }

  const normalizedEmail = ibaEmail.trim().toLowerCase();

  if (
    !normalizedEmail.endsWith('@iba.edu.pk') &&
    !normalizedEmail.endsWith('@khi.iba.edu.pk')
  ) {
    const err = new Error('Only IBA email addresses are allowed.');
    err.statusCode = 400;
    throw err;
  }

  if (studentErp) {
    const existingErp = await prisma.user.findUnique({ where: { studentErp } });
    if (existingErp) {
      const err = new Error('This Student ERP is already registered.');
      err.statusCode = 409;
      throw err;
    }
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  // Check if already in User
  const existingUser = await prisma.user.findUnique({ where: { ibaEmail: normalizedEmail } });
  if (existingUser) {
    const err = new Error('This email is already registered.');
    err.statusCode = 409;
    throw err;
  }

  // Generate 5-digit OTP
  const otp = Math.floor(10000 + Math.random() * 90000).toString();
  const expires = new Date(Date.now() + 10 * 60 * 1000);

  // Use upsert for PendingUser to handle multiple register attempts
  const pendingUser = await prisma.pendingUser.upsert({
    where: { ibaEmail: normalizedEmail },
    update: {
      fullName,
      password: hashedPassword,
      phone,
      studentErp,
      gender,
      verificationCode: otp,
      expiresAt: expires,
    },
    create: {
      fullName,
      ibaEmail: normalizedEmail,
      password: hashedPassword,
      phone,
      studentErp,
      gender,
      verificationCode: otp,
      expiresAt: expires,
    },
  });

  // Send Email
  try {
    const emailResult = await notificationService.sendEmailIfPossible({
      to: pendingUser.ibaEmail,
      subject: 'UniPool: Your Verification Code',
      text: `Hello ${pendingUser.fullName},\n\nYour verification code is: ${otp}\n\nThis code will expire in 10 minutes.`,
    });
    if (!emailResult.sent) {
      console.log(`[DEV] OTP for ${pendingUser.ibaEmail}: ${otp}`);
    }
  } catch (err) {
    console.error('Failed to send verification email:', err);
    console.log(`[DEV] OTP for ${pendingUser.ibaEmail}: ${otp}`);
  }

  return {
    email: pendingUser.ibaEmail,
    message: 'Verification code sent to your email.',
  };
};

const login = async ({ ibaEmail, password }) => {
  if (!ibaEmail || !password) {
    const err = new Error('Email and password are required.');
    err.statusCode = 400;
    throw err;
  }

  const normalizedEmail = ibaEmail.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { ibaEmail: normalizedEmail },
    include: {
      vehicles: true,
    },
  });
  if (!user) {
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    throw err;
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    throw err;
  }

  if (!user.isVerified) {
    const err = new Error('Please verify your email before logging in.');
    err.statusCode = 403;
    throw err;
  }

  const token = jwt.sign(
    {
      id: user.id,
      ibaEmail: user.ibaEmail,
      gender: user.gender,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  return {
    token,
    user: {
      id: user.id,
      fullName: user.fullName,
      ibaEmail: user.ibaEmail,
      gender: user.gender,
      role: user.role,
      trustScore: user.trustScore,
      isVerified: user.isVerified,
      genderVerified: user.genderVerified,
      isDriver: user.isDriver,
      vehicles: user.vehicles,
    },
  };
};

const getMe = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      ibaEmail: true,
      gender: true,
      role: true,
      trustScore: true,
      isVerified: true,
      genderVerified: true,
      isDriver: true,
      phone: true,
      studentErp: true,
      avatarUrl: true,
    }
  });

  if (!user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  return user;
};

const verify = async ({ ibaEmail, code }) => {
  if (!ibaEmail || !code) {
    const err = new Error('Email and verification code are required.');
    err.statusCode = 400;
    throw err;
  }

  const normalizedEmail = ibaEmail.trim().toLowerCase();
  
  // Find in PendingUser
  const pending = await prisma.pendingUser.findUnique({ where: { ibaEmail: normalizedEmail } });

  if (!pending) {
    // Check if already in User (maybe already verified)
    const alreadyUser = await prisma.user.findUnique({ where: { ibaEmail: normalizedEmail } });
    if (alreadyUser) {
      return { message: 'Account is already verified.' };
    }
    const err = new Error('No pending registration found for this email.');
    err.statusCode = 404;
    throw err;
  }

  if (pending.verificationCode !== code) {
    const err = new Error('Invalid verification code.');
    err.statusCode = 400;
    throw err;
  }

  if (new Date() > pending.expiresAt) {
    const err = new Error('Verification code has expired. Please register again.');
    err.statusCode = 400;
    throw err;
  }

  // Create real user and delete pending in a transaction
  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        fullName: pending.fullName,
        ibaEmail: pending.ibaEmail,
        password: pending.password,
        phone: pending.phone,
        studentErp: pending.studentErp,
        gender: pending.gender,
        isVerified: true,
      },
    });

    await tx.pendingUser.delete({ where: { id: pending.id } });
    return newUser;
  });

  return { message: 'Verification successful. You can now log in.' };
};

const resendOtp = async ({ ibaEmail }) => {
  if (!ibaEmail) {
    const err = new Error('Email is required.');
    err.statusCode = 400;
    throw err;
  }

  const normalizedEmail = ibaEmail.trim().toLowerCase();
  const pending = await prisma.pendingUser.findUnique({ where: { ibaEmail: normalizedEmail } });

  if (!pending) {
    const alreadyUser = await prisma.user.findUnique({ where: { ibaEmail: normalizedEmail } });
    if (alreadyUser) {
      const err = new Error('Account is already verified.');
      err.statusCode = 400;
      throw err;
    }
    const err = new Error('No pending registration found.');
    err.statusCode = 404;
    throw err;
  }

  const otp = Math.floor(10000 + Math.random() * 90000).toString();
  const expires = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.pendingUser.update({
    where: { id: pending.id },
    data: {
      verificationCode: otp,
      expiresAt: expires,
    },
  });

  try {
    const emailResult = await notificationService.sendEmailIfPossible({
      to: pending.ibaEmail,
      subject: 'UniPool: Your New Verification Code',
      text: `Hello ${pending.fullName},\n\nYour new verification code is: ${otp}\n\nThis code will expire in 10 minutes.`,
    });
    if (!emailResult.sent) {
      console.log(`[DEV] New OTP for ${pending.ibaEmail}: ${otp}`);
    }
  } catch (err) {
    console.error('Failed to resend verification email:', err);
    console.log(`[DEV] New OTP for ${pending.ibaEmail}: ${otp}`);
  }

  return { message: 'New verification code sent.' };
};

const updateProfile = async (userId, data) => {
  const { fullName, phone, studentErp, gender, avatarUrl } = data;

  const updateData = {};
  if (fullName !== undefined) updateData.fullName = fullName;
  if (phone !== undefined) updateData.phone = phone;
  if (gender !== undefined) updateData.gender = gender;
  if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

  // Handle studentErp carefully due to unique constraint
  if (studentErp !== undefined) {
    if (studentErp === '' || studentErp === null) {
      updateData.studentErp = null; // Store as NULL to avoid empty string unique constraint
    } else {
      // Check for uniqueness
      const existing = await prisma.user.findUnique({ where: { studentErp } });
      if (existing && existing.id !== userId) {
        const err = new Error('This Student ERP is already in use.');
        err.statusCode = 409;
        throw err;
      }
      updateData.studentErp = studentErp;
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      fullName: true,
      ibaEmail: true,
      gender: true,
      role: true,
      trustScore: true,
      isVerified: true,
      genderVerified: true,
      isDriver: true,
      phone: true,
      studentErp: true,
      avatarUrl: true,
    }
  });

  return updated;
};

module.exports = { register, login, getMe, verify, resendOtp, updateProfile };