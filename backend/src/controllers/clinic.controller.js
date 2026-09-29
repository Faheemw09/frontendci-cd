const clinicService = require('../services/clinic.service');
const { createClinicSchema, updateClinicSchema } = require('../validators/authClinic');
const { asyncHandler } = require('../utils/helpers');
const { z } = require('zod');

const list = asyncHandler(async (req, res) => {
  const clinics = await clinicService.listClinics();
  res.json({ clinics });
});

const getOne = asyncHandler(async (req, res) => {
  const clinic = await clinicService.getClinicById(req.params.id);
  res.json({ clinic });
});

const create = asyncHandler(async (req, res) => {
  const body = createClinicSchema
    .extend({ plan: z.enum(['free', 'basic', 'pro']).optional() })
    .parse(req.body);
  const clinic = await clinicService.createClinic(body);
  res.status(201).json({ clinic });
});

const update = asyncHandler(async (req, res) => {
  const body = updateClinicSchema
    .extend({ plan: z.enum(['free', 'basic', 'pro']).optional() })
    .parse(req.body);
  const clinic = await clinicService.updateClinic(req.params.id, body);
  res.json({ clinic });
});

const approve = asyncHandler(async (req, res) => {
  const clinic = await clinicService.approveClinic(req.params.id);
  res.json({ clinic });
});

const suspend = asyncHandler(async (req, res) => {
  const clinic = await clinicService.suspendClinic(req.params.id);
  res.json({ clinic });
});

module.exports = { list, getOne, create, update, approve, suspend };
