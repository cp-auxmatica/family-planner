// --- UTILITIES MODULE (utils.js) ---
// Contains small, reusable helper functions.

/**
 * Formats a time string (e.g., "14:30") into a localized time (e.g., "2:30 PM").
 * @param {string} time - The time string in HH:mm format.
 * @returns {string} The formatted time string.
 */
export const formatTime = (time) => !time ? '' : new Date(`1970-01-01T${time}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

/**
 * Returns the Font Awesome icon class based on the event type.
 * @param {string} type - The type of the task (e.g., 'Doctor', 'Work').
 * @returns {string} The Font Awesome class string (e.g., 'fa-stethoscope').
 */
export const getTaskIcon = (type) => {
    return {
        'Doctor': 'fa-stethoscope',
        'Dentist': 'fa-tooth',
        'School': 'fa-school-bus',
        'Work': 'fa-building',
        'Meeting': 'fa-users',
        'Chore': 'fa-broom',
        'Appointment': 'fa-calendar-check',
        'Errand': 'fa-person-running'
    }[type] || 'fa-calendar-day';
};
