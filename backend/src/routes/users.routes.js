const { Router } = require('express');
const clinicUserController = require('../controllers/clinicUser.controller');
const { clinicScoped } = require('../middleware/rbac');

const router = Router();

router.use(...clinicScoped('clinic_admin'));

router.get('/', clinicUserController.list);
router.post('/', clinicUserController.create);
router.get('/:id', clinicUserController.getOne);
router.patch('/:id', clinicUserController.update);
router.post('/:id/deactivate', clinicUserController.deactivate);

module.exports = router;
