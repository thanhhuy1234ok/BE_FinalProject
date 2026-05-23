export enum AdminClassStatus {
    PENDING = 'PENDING',
    STUDYING = 'STUDYING',
    GRADUATED = 'GRADUATED',
}

export enum CourseOfferingStatus {
    CREATED = 'CREATED',
    WAITING_REGISTRATION = 'WAITING_REGISTRATION',
    OPEN = 'OPEN',
    CLOSED = 'CLOSED',
    IN_PROGRESS = 'IN_PROGRESS',
    FINISHED = 'FINISHED',
}

export enum LessonStatus {
    UPCOMING = 'UPCOMING',
    ONGOING = 'ONGOING',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
}

export enum RegistrationStatus {
    REGISTERED = 'REGISTERED',
    CANCELLED = 'CANCELLED',
    PENDING = 'PENDING',
}

export enum PaymentStatus {
    PENDING = 'PENDING', // chờ thanh toán
    PAID = 'PAID', // đã thanh toán
    OVERDUE = 'OVERDUE', // quá hạn
    CANCELLED = 'CANCELLED', // huỷ
    FAILED = 'FAILED', // thất bại (ví dụ: lỗi thanh toán)
}

export enum PaymentMethod {
    CASH = 'CASH',
    BANK_TRANSFER = 'BANK_TRANSFER',
    MOMO = 'MOMO',
    VNPAY = 'VNPAY',
}
export enum PaymentItemStatus {
    ACTIVE = 'ACTIVE',
    CANCELLED = 'CANCELLED',
}

export enum AttendanceStatus {
    PRESENT = 'PRESENT',
    ABSENT = 'ABSENT',
    LATE = 'LATE',
    NOT_ATTENDED = 'NOT_ATTENDED',
}

export enum AttendanceMethod {
    MANUAL = 'MANUAL',
    QR = 'QR',
}

export enum ConversationType {
    DIRECT = 'DIRECT',
    GROUP = 'GROUP',
    COURSE = 'COURSE',
}

export enum MessageType {
    TEXT = 'TEXT',
    IMAGE = 'IMAGE',
    FILE = 'FILE',
}

export enum MessageStatus {
    SENT = 'SENT',
    READ = 'READ',
}

export enum SOCKET_EVENTS {
    NOTIFICATION_NEW = 'notification:new',
    DOCUMENT_NEW = 'document:new',
    PAYMENT_SUCCESS = 'payment:success',

    CONVERSATION_JOIN = 'conversation:join',
    CONVERSATION_LEAVE = 'conversation:leave',

    MESSAGE_SEND = 'message:send',
    MESSAGE_NEW = 'message:new',

    CONVERSATION_UPDATED = 'conversation:updated',
}

export const LESSON_TIME_MAP: Record<number, { start: string; end: string }> = {
    1: { start: '07:00', end: '07:50' },
    2: { start: '07:50', end: '08:40' },
    3: { start: '08:50', end: '09:40' },
    4: { start: '09:40', end: '10:30' },
    5: { start: '10:40', end: '11:30' },
    6: { start: '13:00', end: '13:50' },
    7: { start: '13:50', end: '14:40' },
    8: { start: '14:50', end: '15:40' },
    9: { start: '15:40', end: '16:30' },
    10: { start: '19:55', end: '20:30' },
    11: { start: '20:30', end: '21:20' },
    12: { start: '21:20', end: '22:10' },
};
