const API_URL = import.meta.env.VITE_API_URL || '';

function authHeaders() {
  const token = localStorage.getItem('clinicy_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...options.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || data.message || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  login: (body) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  registerPatient: (body) =>
    request('/api/auth/register/patient', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/api/auth/me'),

  // Public booking browse
  browseClinics: () => request('/api/booking/clinics'),
  browseClinic: (slugOrId) => request(`/api/booking/clinics/${slugOrId}`),
  browseClinicDoctors: (slugOrId) => request(`/api/booking/clinics/${slugOrId}/doctors`),
  browseSlots: (doctorId, date) =>
    request(`/api/booking/doctors/${doctorId}/slots?date=${date}`),
  confirmBooking: (body) =>
    request('/api/booking/confirm', { method: 'POST', body: JSON.stringify(body) }),

  patientMe: () => request('/api/patient/me'),
  updatePatientMe: (body) =>
    request('/api/patient/me', { method: 'PATCH', body: JSON.stringify(body) }),

  // Super admin
  adminStats: () => request('/api/admin/stats'),
  listClinics: () => request('/api/clinics'),
  updateClinicAdmin: (id, body) =>
    request(`/api/clinics/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  approveClinic: (id) => request(`/api/clinics/${id}/approve`, { method: 'POST' }),
  suspendClinic: (id) => request(`/api/clinics/${id}/suspend`, { method: 'POST' }),
  listPlatformIssues: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/admin/platform-issues${q ? `?${q}` : ''}`);
  },
  createPlatformIssue: (body) =>
    request('/api/admin/platform-issues', { method: 'POST', body: JSON.stringify(body) }),
  updatePlatformIssue: (id, body) =>
    request(`/api/admin/platform-issues/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  getClinic: () => request('/api/clinic'),
  updateClinic: (body) =>
    request('/api/clinic', { method: 'PATCH', body: JSON.stringify(body) }),

  listUsers: () => request('/api/users'),
  createUser: (body) => request('/api/users', { method: 'POST', body: JSON.stringify(body) }),
  updateUser: (id, body) =>
    request(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deactivateUser: (id) => request(`/api/users/${id}/deactivate`, { method: 'POST' }),

  listDoctors: () => request('/api/doctors'),
  getDoctorMe: () => request('/api/doctors/me'),
  createDoctor: (body) =>
    request('/api/doctors', { method: 'POST', body: JSON.stringify(body) }),
  updateDoctor: (id, body) =>
    request(`/api/doctors/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deactivateDoctor: (id) => request(`/api/doctors/${id}/deactivate`, { method: 'POST' }),
  getAvailability: (doctorId) => request(`/api/doctors/${doctorId}/availability`),
  replaceAvailability: (doctorId, windows) =>
    request(`/api/doctors/${doctorId}/availability`, {
      method: 'PUT',
      body: JSON.stringify({ windows }),
    }),
  getSlots: (doctorId, date) =>
    request(`/api/doctors/${doctorId}/slots?date=${date}`),

  listAppointments: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/appointments${q ? `?${q}` : ''}`);
  },
  walkIn: (body) =>
    request('/api/appointments/walk-in', { method: 'POST', body: JSON.stringify(body) }),
  cancelAppointment: (id, reason) =>
    request(`/api/appointments/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  rescheduleAppointment: (id, body) =>
    request(`/api/appointments/${id}/reschedule`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateAppointmentStatus: (id, status) =>
    request(`/api/appointments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  listTickets: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/support-tickets${q ? `?${q}` : ''}`);
  },
  getTicket: (id) => request(`/api/support-tickets/${id}`),
  createTicket: (body) =>
    request('/api/support-tickets', { method: 'POST', body: JSON.stringify(body) }),
  updateTicket: (id, body) =>
    request(`/api/support-tickets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  replyTicket: (id, body) =>
    request(`/api/support-tickets/${id}/replies`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),
};

export function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}
