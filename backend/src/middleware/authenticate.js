const passport = require('../config/passport');

/** Verify JWT and attach req.user (Prisma User + profiles). */
function authenticate(req, res, next) {
  passport.authenticate('jwt', { session: false }, (err, user) => {
    if (err) return next(err);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    req.user = user;
    return next();
  })(req, res, next);
}

module.exports = { authenticate };
