const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const register = async ({ fullName, ibaEmail, password, phone, studentErp, gender }) => {
  if (!fullName || !ibaEmail || !password || !gender) {
    const err = new Error('Full name, email, password, and gender are required.');
    err.statusCode = 400;
    throw err;
  }

  const normalizedEmail = ibaEmail.trim().toLowerCase();

  const existing = await prisma.user.findUnique({ where: { ibaEmail: normalizedEmail } });
  if (existing) {
    const err = new Error('This email is already registered.');
    err.statusCode = 409;
    throw err;
  }

  if (
    !normalizedEmail.endsWith('@iba.edu.pk') &&
    !normalizedEmail.endsWith('@khi.iba.edu.pk')
  ) {
    const err = new Error('Only IBA email addresses are allowed.');
    err.statusCode = 400;
    throw err;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      fullName,
      ibaEmail: normalizedEmail,
      password: hashedPassword,
      phone,
      studentErp,
      gender,
    },
  });

  return {
    id: user.id,
    fullName: user.fullName,
    ibaEmail: user.ibaEmail,
    gender: user.gender,
    role: user.role,
  };
};

const login = async ({ ibaEmail, password }) => {
  if (!ibaEmail || !password) {
    const err = new Error('Email and password are required.');
    err.statusCode = 400;
    throw err;
  }

  const normalizedEmail = ibaEmail.trim().toLowerCase();

  const user = await prisma.user.findUnique({ where: { ibaEmail: normalizedEmail } });
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
      trustScore: true
    }
  });

  if (!user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  return user;
};

module.exports = { register, login, getMe };