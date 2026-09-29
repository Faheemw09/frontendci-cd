const { Router } = require('express');
const adminController = require('../controllers/admin.controller');
const { platformScoped } = require('../middleware/rbac');

const router = Router();

router.use(...platformScoped('super_admin'));

router.get('/stats', adminController.stats);
router.get('/platform-issues', adminController.listIssues);
router.post('/platform-issues', adminController.createIssue);
router.patch('/platform-issues/:id', adminController.updateIssue);

module.exports = router;
