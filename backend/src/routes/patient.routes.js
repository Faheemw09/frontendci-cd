const { Router } = require('express');
const patientController = require('../controllers/patient.controller');
const { platformScoped } = require('../middleware/rbac');

const router = Router();

router.get('/me', ...platformScoped('patient'), patientController.getMe);
router.patch('/me', ...platformScoped('patient'), patientController.updateMe);

module.exports = router;
