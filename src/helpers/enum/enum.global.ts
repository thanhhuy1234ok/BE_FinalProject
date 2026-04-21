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
    DONE = 'DONE',
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
}

export enum PaymentMethod {
    CASH = 'CASH',
    BANK_TRANSFER = 'BANK_TRANSFER',
    MOMO = 'MOMO',
}
export enum PaymentItemStatus {
    ACTIVE = 'ACTIVE',
    CANCELLED = 'CANCELLED',
}
