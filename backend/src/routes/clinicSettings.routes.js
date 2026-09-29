const { Router } = require('express');
const clinicSettingsController = require('../controllers/clinicSettings.controller');
const { clinicScoped } = require('../middleware/rbac');

const router = Router();

router.get('/', ...clinicScoped('clinic_admin', 'doctor'), clinicSettingsController.getSettings);
router.patch('/', ...clinicScoped('clinic_admin'), clinicSettingsController.patchSettings);

module.exports = router;
