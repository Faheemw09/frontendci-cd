const clinicUserService = require('../services/clinicUser.service');
const {
  createClinicUserSchema,
  updateClinicUserSchema,
  bootstrapClinicAdminSchema,
} = require('../validators/clinicOps');
const { asyncHandler } = require('../utils/helpers');

const list = asyncHandler(async (req, res) => {
  const users = await clinicUserService.listClinicUsers(req.db);
  res.json({ users });
});

const getOne = asyncHandler(async (req, res) => {
  const user = await clinicUserService.getClinicUser(req.db, req.params.id);
  res.json({ user });
});

const create = asyncHandler(async (req, res) => {
  const body = createClinicUserSchema.parse(req.body);
  const user = await clinicUserService.createClinicUser(req.db, req.clinicId, body);
  res.status(201).json({ user });
});

const update = asyncHandler(async (req, res) => {
  const body = updateClinicUserSchema.parse(req.body);
  const user = await clinicUserService.updateClinicUser(req.db, req.params.id, body);
  res.json({ user });
});

const deactivate = asyncHandler(async (req, res) => {
  const user = await clinicUserService.deactivateClinicUser(req.db, req.params.id);
  res.json({ user });
});

const bootstrapAdmin = asyncHandler(async (req, res) => {
  const body = bootstrapClinicAdminSchema.parse(req.body);
  const user = await clinicUserService.bootstrapClinicAdmin(
    req.db,
    req.params.id,
    body
  );
  res.status(201).json({ user });
});

module.exports = { list, getOne, create, update, deactivate, bootstrapAdmin };
