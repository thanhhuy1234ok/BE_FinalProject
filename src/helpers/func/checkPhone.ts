export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/\s+/g, '');
  return /^(\+84|0)[3|5|7|8|9]\d{8}$/.test(cleaned);
}

