const ngn = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' });
const dt = new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short' });

export const formatNaira = (v) => ngn.format(Number(v || 0));
export const formatDateTime = (iso) => (iso ? dt.format(new Date(iso)) : '-');
export const onlyDigits = (s) => s.replace(/\D/g, '');
