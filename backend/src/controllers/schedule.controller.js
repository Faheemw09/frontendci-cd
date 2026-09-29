const scheduleService = require('../services/schedule.service');
const slotsService = require('../services/slots.service');
const {
  createAvailabilitySchema,
  updateAvailabilitySchema,
  replaceAvailabilitySchema,
  createLeaveSchema,
  updateLeaveSchema,
  slotsQuerySchema,
} = require('../validators/clinicOps');
const { asyncHandler } = require('../utils/helpers');

const listAvailability = asyncHandler(async (req, res) => {
  const windows = await scheduleService.listAvailability(req.db, req.targetDoctorId);
  res.json({ availability: windows });
});

const createAvailability = asyncHandler(async (req, res) => {
  const body = createAvailabilitySchema.parse(req.body);
  const window = await scheduleService.createAvailability(
    req.db,
    req.clinicId,
    req.targetDoctorId,
    body
  );
  res.status(201).json({ availability: window });
});

const replaceAvailability = asyncHandler(async (req, res) => {
  const body = replaceAvailabilitySchema.parse(req.body);
  const windows = await scheduleService.replaceAvailability(
    req.db,
    req.clinicId,
    req.targetDoctorId,
    body.windows
  );
  res.json({ availability: windows });
});

const updateAvailability = asyncHandler(async (req, res) => {
  const body = updateAvailabilitySchema.parse(req.body);
  const window = await scheduleService.updateAvailability(
    req.db,
    req.targetDoctorId,
    req.params.availabilityId,
    body
  );
  res.json({ availability: window });
});

const deleteAvailability = asyncHandler(async (req, res) => {
  const result = await scheduleService.deleteAvailability(
    req.db,
    req.targetDoctorId,
    req.params.availabilityId
  );
  res.json(result);
});

const listLeave = asyncHandler(async (req, res) => {
  const leave = await scheduleService.listLeave(req.db, req.targetDoctorId);
  res.json({ leave });
});

const createLeave = asyncHandler(async (req, res) => {
  const body = createLeaveSchema.parse(req.body);
  const leave = await scheduleService.createLeave(
    req.db,
    req.clinicId,
    req.targetDoctorId,
    body
  );
  res.status(201).json({ leave });
});

const updateLeave = asyncHandler(async (req, res) => {
  const body = updateLeaveSchema.parse(req.body);
  const leave = await scheduleService.updateLeave(
    req.db,
    req.targetDoctorId,
    req.params.leaveId,
    body
  );
  res.json({ leave });
});

const deleteLeave = asyncHandler(async (req, res) => {
  const result = await scheduleService.deleteLeave(
    req.db,
    req.targetDoctorId,
    req.params.leaveId
  );
  res.json(result);
});

const getSlots = asyncHandler(async (req, res) => {
  const { date } = slotsQuerySchema.parse(req.query);
  const clinicId =
    req.user.role === 'patient' || req.user.role === 'super_admin'
      ? null
      : req.clinicId;
  const result = await slotsService.getAvailableSlots(
    req.params.doctorId,
    date,
    clinicId
  );
  res.json(result);
});

module.exports = {
  listAvailability,
  createAvailability,
  replaceAvailability,
  updateAvailability,
  deleteAvailability,
  listLeave,
  createLeave,
  updateLeave,
  deleteLeave,
  getSlots,
};
