import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import relativeTime from 'dayjs/plugin/relativeTime';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import vi from 'dayjs/locale/vi';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);
dayjs.extend(customParseFormat);

dayjs.locale(vi);
dayjs.tz.setDefault('Asia/Ho_Chi_Minh');

export class DateFormatter {
  static formatDate(date: string | Date, format = 'YYYY-MM-DD'): string {
    return dayjs(date).format(format);
  }

  static formatDateTime(date: string | Date): string {
    return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
  }

  static formatTime(date: string | Date): string {
    return dayjs(date).format('HH:mm');
  }

  static formatFull(date: string | Date): string {
    return dayjs(date).format('dddd, DD/MM/YYYY HH:mm');
  }

  static fromNow(date: string | Date): string {
    return dayjs(date).fromNow(); // e.g., "2 giờ trước"
  }

  static toNow(date: string | Date): string {
    return dayjs().to(dayjs(date)); // e.g., "trong 1 ngày"
  }

  static parse(dateString: string, format = 'DD-MM-YYYY'): dayjs.Dayjs {
    return dayjs(dateString, format);
  }

  static isBefore(date1: string | Date, date2: string | Date): boolean {
    return dayjs(date1).isBefore(dayjs(date2));
  }

  static isAfter(date1: string | Date, date2: string | Date): boolean {
    return dayjs(date1).isAfter(dayjs(date2));
  }

  static getCurrentDate(): string {
    return dayjs().format('YYYY-MM-DD');
  }

  static getCurrentTime(): string {
    return dayjs().format('HH:mm:ss');
  }

  static getCurrentDateTime(): string {
    return dayjs().format('YYYY-MM-DD HH:mm:ss');
  }

  static setLocale(locale: string): void {
    dayjs.locale(locale);
  }

  static setTimezone(tz: string): void {
    dayjs.tz.setDefault(tz);
  }

  static getTimePlusMinutes(date: string | Date, minutes: number): Date {
    return dayjs(date).add(minutes, 'minute').toDate();
  }
}
