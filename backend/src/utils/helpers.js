function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    role: user.role,
    clinicId: user.clinicId,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
    isActive: user.isActive,
    doctorProfile: user.doctorProfile
      ? { id: user.doctorProfile.id, clinicId: user.doctorProfile.clinicId }
      : null,
    patientProfile: user.patientProfile
      ? { id: user.patientProfile.id }
      : null,
  };
}

module.exports = { asyncHandler, slugify, publicUser };
