export default function parseDateTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0); // Thiết lập giờ, phút, giây
  return result;
}
