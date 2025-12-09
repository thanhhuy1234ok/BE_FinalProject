export function isValidPhone(phone) {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  const regex = /^(0|\+84)\d{9}$/;
  return regex.test(cleaned);
}