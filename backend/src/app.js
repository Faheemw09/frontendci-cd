const express = require('express');
const cors = require('cors');
const passport = require('./config/passport');
const { errorHandler } = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth.routes');
const clinicsRoutes = require('./routes/clinics.routes');
const usersRoutes = require('./routes/users.routes');
const doctorsRoutes = require('./routes/doctors.routes');
const appointmentsRoutes = require('./routes/appointments.routes');
const bookingRoutes = require('./routes/booking.routes');
const ticketsRoutes = require('./routes/tickets.routes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(passport.initialize());

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'clinicy-api' });
});

app.use('/public', require('./routes/publicSsr.routes'));
app.use('/api/auth', authRoutes);
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/clinics', clinicsRoutes);
app.use('/api/clinic', require('./routes/clinicSettings.routes'));
app.use('/api/users', usersRoutes);
app.use('/api/doctors', doctorsRoutes);
app.use('/api/booking', bookingRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/support-tickets', ticketsRoutes);
app.use('/api/patient', require('./routes/patient.routes'));

app.use(errorHandler);

module.exports = app;
