import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentItem } from '@/payment-item/entities/payment-item.entity';
import { CourseRegistration } from '@/course-registration/entities/course-registration.entity';
import { Student } from '@/users/entities/student.entity';
import {
    PaymentItemStatus,
    PaymentStatus,
    RegistrationStatus,
} from '@/helpers/enum/enum.global';
import { PayPaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentService {
    private readonly CREDIT_PRICE = 350000;
    private readonly DUE_DAYS = 3;
    constructor(
        @InjectRepository(Payment)
        private readonly paymentRepo: Repository<Payment>,

        @InjectRepository(PaymentItem)
        private readonly paymentItemRepo: Repository<PaymentItem>,

        @InjectRepository(CourseRegistration)
        private readonly registrationRepo: Repository<CourseRegistration>,

        @InjectRepository(Student)
        private readonly studentRepo: Repository<Student>,
    ) {}

    private async generatePaymentCode(paymentRepo?: Repository<Payment>) {
        const repo = paymentRepo ?? this.paymentRepo;

        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');

        const count = await repo.count();
        const seq = String(count + 1).padStart(4, '0');

        return `PAY-${y}${m}${d}-${seq}`;
    }

    private buildDueDate(): Date {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + this.DUE_DAYS);
        return dueDate;
    }

    async recalculatePayment(paymentId: number, manager?: EntityManager) {
        const paymentRepo = manager
            ? manager.getRepository(Payment)
            : this.paymentRepo;

        const payment = await paymentRepo.findOne({
            where: { id: paymentId },
            relations: {
                items: true,
            },
        });

        if (!payment) {
            throw new NotFoundException('Không tìm thấy phiếu thanh toán');
        }

        const activeItems = (payment.items ?? []).filter(
            (item) => item.status === PaymentItemStatus.ACTIVE,
        );

        payment.totalCredits = activeItems.reduce(
            (sum, item) => sum + Number(item.credits ?? 0),
            0,
        );

        payment.totalAmount = activeItems.reduce(
            (sum, item) => sum + Number(item.amount ?? 0),
            0,
        );

        if (activeItems.length === 0) {
            payment.status = PaymentStatus.CANCELLED;
        } else if (payment.status === PaymentStatus.CANCELLED) {
            payment.status = PaymentStatus.PENDING;
        }

        return await paymentRepo.save(payment);
    }

    async findPendingPaymentByStudentAndTerm(
        studentId: number,
        termId: number,
    ) {
        return await this.paymentRepo.findOne({
            where: {
                student: { id: studentId },
                term: { id: termId },
                status: PaymentStatus.PENDING,
            },
            relations: {
                items: {
                    registration: true,
                    courseOffering: true,
                },
                term: true,
                student: true,
            },
            order: {
                createdAt: 'DESC',
            },
        });
    }

    async attachRegistrationToPayment(
        registrationId: number,
        manager?: EntityManager,
    ) {
        const registrationRepo = manager
            ? manager.getRepository(CourseRegistration)
            : this.registrationRepo;

        const paymentRepo = manager
            ? manager.getRepository(Payment)
            : this.paymentRepo;

        const paymentItemRepo = manager
            ? manager.getRepository(PaymentItem)
            : this.paymentItemRepo;

        const registration = await registrationRepo.findOne({
            where: { id: registrationId },
            relations: {
                student: true,
                courseOffering: {
                    term: true,
                    teacherSubject: {
                        subject: true,
                    },
                },
            },
        });

        if (!registration) {
            throw new NotFoundException('Không tìm thấy đăng ký môn');
        }

        if (registration.status !== RegistrationStatus.REGISTERED) {
            throw new BadRequestException(
                'Đăng ký môn không còn hiệu lực để tạo phiếu thanh toán',
            );
        }

        let payment = await paymentRepo.findOne({
            where: {
                student: { id: registration.studentId },
                term: { id: registration.courseOffering.term.id },
                status: PaymentStatus.PENDING,
            },
            relations: {
                items: true,
                student: true,
                term: true,
            },
            order: {
                createdAt: 'DESC',
            },
        });

        if (!payment) {
            payment = paymentRepo.create({
                code: await this.generatePaymentCode(paymentRepo),
                student: registration.student,
                term: registration.courseOffering.term,
                totalCredits: 0,
                totalAmount: 0,
                status: PaymentStatus.PENDING,
                dueDate: this.buildDueDate(),
                paidAt: null,
                paymentMethod: null,
                note: null,
            });

            payment = await paymentRepo.save(payment);
        }

        const existedItem = await paymentItemRepo.findOne({
            where: {
                payment: { id: payment.id },
                registration: { id: registration.id },
            },
            relations: {
                payment: true,
                registration: true,
            },
        });

        if (!existedItem) {
            const subject = registration.courseOffering.teacherSubject.subject;
            const credits = Number(subject?.credit ?? 0);
            const unitPrice = this.CREDIT_PRICE;
            const amount = credits * unitPrice;

            const paymentItem = paymentItemRepo.create({
                payment,
                registration,
                courseOffering: registration.courseOffering,
                credits,
                unitPrice,
                amount,
                status: PaymentItemStatus.ACTIVE,
            });

            await paymentItemRepo.save(paymentItem);
        }

        await this.recalculatePayment(payment.id, manager);

        return await paymentRepo.findOne({
            where: { id: payment.id },
            relations: {
                term: true,
                items: {
                    registration: true,
                    courseOffering: {
                        teacherSubject: {
                            subject: true,
                        },
                    },
                },
            },
        });
    }

    async cancelRegistrationAndUpdatePayment(
        studentUserId: string,
        registrationId: number,
    ) {
        const registration = await this.registrationRepo.findOne({
            where: {
                id: registrationId,
                student: { user: { id: studentUserId } },
            },
            relations: {
                student: { user: true },
                courseOffering: {
                    term: true,
                },
            },
        });

        if (!registration) {
            throw new NotFoundException('Không tìm thấy đăng ký môn');
        }

        if (registration.status === RegistrationStatus.CANCELLED) {
            throw new BadRequestException('Môn học này đã được hủy trước đó');
        }

        const payment = await this.findPendingPaymentByStudentAndTerm(
            registration.student.id,
            registration.courseOffering.term.id,
        );

        const paidPayment = await this.paymentRepo.findOne({
            where: {
                student: { id: registration.student.id },
                term: { id: registration.courseOffering.term.id },
                status: PaymentStatus.PAID,
            },
        });

        if (paidPayment) {
            throw new BadRequestException(
                'Môn học đã thuộc phiếu thanh toán đã thanh toán, vui lòng liên hệ phòng đào tạo để được hỗ trợ',
            );
        }

        registration.status = RegistrationStatus.CANCELLED;
        await this.registrationRepo.save(registration);

        if (payment) {
            const paymentItem = await this.paymentItemRepo.findOne({
                where: {
                    payment: { id: payment.id },
                    registration: { id: registration.id },
                    status: PaymentItemStatus.ACTIVE,
                },
                relations: {
                    payment: true,
                    registration: true,
                },
            });

            if (paymentItem) {
                paymentItem.status = PaymentItemStatus.CANCELLED;
                await this.paymentItemRepo.save(paymentItem);
                await this.recalculatePayment(payment.id);
            }

            return {
                message: 'Hủy đăng ký môn thành công',
                payment: await this.getPaymentDetail(payment.id),
            };
        }

        return {
            message: 'Hủy đăng ký môn thành công',
            payment: null,
        };
    }

    async pay(studentUserId: string, paymentId: number, dto: PayPaymentDto) {
        const payment = await this.paymentRepo.findOne({
            where: {
                id: paymentId,
                student: { user: { id: studentUserId } },
            },
            relations: {
                student: { user: true },
                items: {
                    registration: true,
                    courseOffering: {
                        teacherSubject: {
                            subject: true,
                        },
                    },
                },
                term: true,
            },
        });

        if (!payment) {
            throw new NotFoundException('Không tìm thấy phiếu thanh toán');
        }

        if (payment.status === PaymentStatus.PAID) {
            throw new BadRequestException(
                'Phiếu thanh toán đã được thanh toán',
            );
        }

        if (payment.status === PaymentStatus.CANCELLED) {
            throw new BadRequestException(
                'Phiếu thanh toán đã bị hủy, không thể thanh toán',
            );
        }

        if (payment.dueDate && new Date() > new Date(payment.dueDate)) {
            payment.status = PaymentStatus.OVERDUE;
            await this.paymentRepo.save(payment);
            throw new BadRequestException('Phiếu thanh toán đã quá hạn');
        }

        const activeItems = payment.items.filter(
            (item) => item.status === PaymentItemStatus.ACTIVE,
        );

        if (!activeItems.length) {
            throw new BadRequestException(
                'Không có môn học hợp lệ để thanh toán',
            );
        }

        payment.status = PaymentStatus.PAID;
        payment.paidAt = new Date();
        payment.paymentMethod = dto.paymentMethod;
        payment.note = dto.note ?? payment.note ?? null;

        await this.paymentRepo.save(payment);

        return await this.getPaymentDetail(payment.id);
    }

    async getMyCurrent(studentUserId: string) {
        const student = await this.studentRepo.findOne({
            where: {
                user: { id: studentUserId },
            },
            relations: {
                user: true,
            },
        });

        if (!student) {
            throw new NotFoundException('Không tìm thấy sinh viên');
        }

        const payment = await this.paymentRepo.findOne({
            where: {
                student: { id: student.id },
                status: PaymentStatus.PENDING,
            },
            relations: {
                term: true,
                items: {
                    registration: true,
                    courseOffering: {
                        teacherSubject: {
                            subject: true,
                            teacher: { user: true },
                        },
                    },
                },
            },
            order: {
                createdAt: 'DESC',
            },
        });

        if (!payment) return null;

        if (payment.dueDate && new Date() > new Date(payment.dueDate)) {
            payment.status = PaymentStatus.OVERDUE;
            await this.paymentRepo.save(payment);
        }

        return await this.getPaymentDetail(payment.id);
    }

    async getPaymentDetail(paymentId: number) {
        const payment = await this.paymentRepo.findOne({
            where: { id: paymentId },
            relations: {
                student: {
                    user: true,
                },
                term: true,
                items: {
                    registration: true,
                    courseOffering: {
                        adminClass: true,
                        teacherSubject: {
                            subject: true,
                            teacher: {
                                user: true,
                            },
                        },
                    },
                },
            },
            order: {
                items: {
                    id: 'ASC',
                },
            },
        });

        if (!payment) {
            throw new NotFoundException('Không tìm thấy phiếu thanh toán');
        }

        return payment;
    }
}
