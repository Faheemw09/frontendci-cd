/**
 * Ensures the doctorId in the route is accessible:
 * - clinic_admin: any doctor in tenant (scoped db)
 * - doctor: only their own doctorProfile.id
 */
function requireDoctorAccess(paramName = 'doctorId') {
  return (req, res, next) => {
    const doctorId = req.params[paramName];
    if (!doctorId) {
      return res.status(400).json({ error: 'doctorId required' });
    }

    if (req.user.role === 'clinic_admin') {
      req.targetDoctorId = doctorId;
      return next();
    }

    if (req.user.role === 'doctor') {
      const ownId = req.user.doctorProfile?.id;
      if (!ownId || ownId !== doctorId) {
        return res.status(403).json({ error: 'Doctors may only manage their own schedule' });
      }
      req.targetDoctorId = doctorId;
      return next();
    }

    return res.status(403).json({ error: 'Forbidden' });
  };
}

module.exports = { requireDoctorAccess };
