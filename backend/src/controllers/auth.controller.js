const authService = require('../services/auth.service');
const clinicSignupService = require('../services/clinicSignup.service');
const {
  loginSchema,
  registerPatientSchema,
  clinicSignupSchema,
} = require('../validators/authClinic');
const { asyncHandler } = require('../utils/helpers');

const login = asyncHandler(async (req, res) => {
  const body = loginSchema.parse(req.body);
  const result = await authService.login(body);
  res.json(result);
});

const registerPatient = asyncHandler(async (req, res) => {
  const body = registerPatientSchema.parse(req.body);
  const result = await authService.registerPatient(body);
  res.status(201).json(result);
});

const clinicSignup = asyncHandler(async (req, res) => {
  const body = clinicSignupSchema.parse(req.body);
  const result = await clinicSignupService.clinicSignup(body);
  res.status(201).json(result);
});

const me = asyncHandler(async (req, res) => {
  const user = await authService.me(req.user.id);
  res.json({ user });
});

module.exports = { login, registerPatient, clinicSignup, me };
