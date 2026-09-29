const patientProfile = require('../services/patientProfile.service');
const { asyncHandler } = require('../utils/helpers');
const { z } = require('zod');

const updateSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  fullName: z.string().min(1).max(200).optional(),
  phone: z.string().min(7).max(20).optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  gender: z.string().max(20).optional(),
  dateOfBirth: z.string().date().nullable().optional(),
});

const getMe = asyncHandler(async (req, res) => {
  const profile = await patientProfile.getPatientProfile(req.user.id);
  res.json(profile);
});

const updateMe = asyncHandler(async (req, res) => {
  const body = updateSchema.parse(req.body);
  const profile = await patientProfile.updatePatientProfile(req.user.id, body);
  res.json(profile);
});

module.exports = { getMe, updateMe };
