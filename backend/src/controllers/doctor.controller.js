const doctorService = require('../services/doctor.service');
const { createDoctorSchema, updateDoctorSchema } = require('../validators/clinicOps');
const { asyncHandler } = require('../utils/helpers');
const { httpError } = require('../utils/httpError');

const list = asyncHandler(async (req, res) => {
  if (req.user.role === 'doctor') {
    const ownId = req.user.doctorProfile?.id;
    if (!ownId) throw httpError(404, 'Doctor profile not found');
    const doctor = await doctorService.getDoctor(req.db, ownId);
    return res.json({ doctors: [doctor] });
  }
  const doctors = await doctorService.listDoctors(req.db);
  res.json({ doctors });
});

const getOne = asyncHandler(async (req, res) => {
  if (req.user.role === 'doctor' && req.params.id !== req.user.doctorProfile?.id) {
    throw httpError(403, 'Doctors may only view their own profile');
  }
  const doctor = await doctorService.getDoctor(req.db, req.params.id);
  res.json({ doctor });
});

const getMe = asyncHandler(async (req, res) => {
  const ownId = req.user.doctorProfile?.id;
  if (!ownId) throw httpError(404, 'Doctor profile not found');
  const doctor = await doctorService.getDoctor(req.db, ownId);
  res.json({ doctor });
});

const create = asyncHandler(async (req, res) => {
  const body = createDoctorSchema.parse(req.body);
  const doctor = await doctorService.createDoctor(req.db, req.clinicId, body);
  res.status(201).json({ doctor });
});

const update = asyncHandler(async (req, res) => {
  const body = updateDoctorSchema.parse(req.body);
  const doctor = await doctorService.updateDoctor(req.db, req.params.id, body);
  res.json({ doctor });
});

const deactivate = asyncHandler(async (req, res) => {
  const doctor = await doctorService.deactivateDoctor(req.db, req.params.id);
  res.json({ doctor });
});

module.exports = { list, getOne, getMe, create, update, deactivate };
