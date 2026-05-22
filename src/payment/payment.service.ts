import {
    BadRequestException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentItem } from '@/payment-item/entities/payment-item.entity';
import { CourseRegistration } from '@/course-registration/entities/course-registration.entity';
import { Student } from '@/users/entities/student.entity';
import {
    PaymentMethod,
    PaymentStatus,
    RegistrationStatus,
} from '@/helpers/enum/enum.global';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import QueryString, * as qs from 'qs';
import crypto from 'crypto';
import {
    createVnpaySecureHash,
    formatCurrency,
    sortObject,
} from '@/helpers/func/genpayment';
import moment from 'moment';
import { User } from '@/users/entities/user.entity';
import { NotificationService } from '@/notification/notification.service';
import { MailService } from '@/mail/mail.service';
import { ChatAppService } from '@/chat-app/chat-app.service';
@Injectable()
export class PaymentService {
    private CREDIT_PRICE = 350000;
    constructor(
        @InjectRepository(Payment)
        private readonly paymentRepo: Repository<Payment>,

        @InjectRepository(PaymentItem)
        private readonly paymentItemRepo: Repository<PaymentItem>,

        @InjectRepository(CourseRegistration)
        private readonly registrationRepo: Repository<CourseRegistration>,

        @InjectRepository(Student)
        private readonly studentRepo: Repository<Student>,

        @InjectRepository(User)
        private userRepo: Repository<User>,

        private readonly notificationService: NotificationService,

        private readonly mailerService: MailService,

        private readonly chatAppService: ChatAppService,

        private configService: ConfigService,

        private dataSource: EntityManager,
    ) {}

    async getRegisteredCoursesForPayment(studentUserId: string) {
        const student = await this.studentRepo.findOne({
            where: { user: { id: studentUserId } },
        });

        if (!student) {
            throw new NotFoundException('Không tìm thấy sinh viên');
        }

        const registrations = await this.registrationRepo.find({
            where: {
                studentId: student.id,
                status: RegistrationStatus.REGISTERED,
            },
            relations: {
                courseOffering: {
                    term: true,
                    schedules: {
                        room: true,
                    },
                    teacherSubject: {
                        subject: true,
                        teacher: {
                            user: true,
                        },
                    },
                },
                paymentItem: {
                    payment: true,
                },
            },
            order: {
                createdAt: 'DESC',
            },
        });

        const data = registrations
            .filter((registration) => {
                const paymentStatus = registration.paymentItem?.payment?.status;

                return (
                    !paymentStatus ||
                    paymentStatus === PaymentStatus.PENDING ||
                    paymentStatus === PaymentStatus.FAILED
                );
            })
            .map((registration) => {
                const courseOffering = registration.courseOffering;
                const subject = courseOffering.teacherSubject.subject;
                const teacher = courseOffering.teacherSubject.teacher;
                const payment = registration.paymentItem?.payment ?? null;

                const unitPrice = 350000;
                const credits = subject.credit ?? 0;
                const amount = credits * unitPrice;

                return {
                    registrationId: registration.id,
                    courseOfferingId: courseOffering.id,
                    courseCode: courseOffering.code,

                    subject: {
                        id: subject.id,
                        code: subject.code,
                        name: subject.name,
                        credit: credits,
                    },

                    teacher: {
                        id: teacher.id,
                        name: teacher.user?.name ?? null,
                    },

                    term: courseOffering.term,
                    schedules: courseOffering.schedules,

                    unitPrice,
                    amount,

                    payment: payment
                        ? {
                              id: payment.id,
                              code: payment.code,
                              status: payment.status,
                              totalAmount: payment.totalAmount,
                              dueDate: payment.dueDate,
                          }
                        : null,
                };
            });

        const totalCredits = data.reduce(
            (sum, item) => sum + item.subject.credit,
            0,
        );

        const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);

        return {
            result: {
                items: data,
                totalCredits,
                totalAmount,
            },
        };
    }

    async createInvoice(studentUserId: string) {
        return this.dataSource.transaction(async (manager) => {
            const studentRepo = manager.getRepository(Student);
            const registrationRepo = manager.getRepository(CourseRegistration);
            const paymentRepo = manager.getRepository(Payment);
            const paymentItemRepo = manager.getRepository(PaymentItem);

            const student = await studentRepo.findOne({
                where: { user: { id: studentUserId } },
                relations: { user: true },
            });

            if (!student) {
                throw new NotFoundException('Không tìm thấy sinh viên');
            }

            const existedPayment = await paymentRepo.findOne({
                where: {
                    studentId: student.id,
                    status: PaymentStatus.PENDING,
                },
                relations: {
                    items: {
                        courseOffering: {
                            teacherSubject: {
                                subject: true,
                            },
                        },
                        registration: true,
                    },
                    term: true,
                },
                order: { createdAt: 'DESC' },
            });

            if (existedPayment) {
                return existedPayment;
            }

            const registrations = await registrationRepo.find({
                where: {
                    studentId: student.id,
                    status: RegistrationStatus.REGISTERED,
                },
                relations: {
                    courseOffering: {
                        term: true,
                        teacherSubject: {
                            subject: true,
                        },
                    },
                },
            });

            if (!registrations.length) {
                throw new BadRequestException(
                    'Không có môn học nào cần tạo hóa đơn',
                );
            }

            const firstTermId = registrations[0].courseOffering.term.id;

            const isDifferentTerm = registrations.some(
                (item) => item.courseOffering.term.id !== firstTermId,
            );

            if (isDifferentTerm) {
                throw new BadRequestException(
                    'Không thể tạo hóa đơn cho nhiều học kỳ khác nhau',
                );
            }

            const unitPrice = 350000;

            const items = registrations.map((registration) => {
                const credits = Number(
                    registration.courseOffering.teacherSubject.subject.credit ??
                        0,
                );

                const amount = credits * unitPrice;

                return paymentItemRepo.create({
                    registrationId: registration.id,
                    credits,
                    unitPrice: unitPrice.toString(),
                    amount: amount.toString(),
                    courseOfferingId: registration.courseOfferingId,
                });
            });

            const totalCredits = items.reduce(
                (sum, item) => sum + Number(item.credits),
                0,
            );

            const totalAmount = items.reduce(
                (sum, item) => sum + Number(item.amount),
                0,
            );

            const payment = paymentRepo.create({
                code: `${uuidv4()}`,
                studentId: student.id,
                termId: firstTermId,

                status: PaymentStatus.PENDING,
                paymentMethod: null,

                totalCredits,
                totalAmount: totalAmount.toString(),

                dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),

                items,
            });

            return paymentRepo.save(payment);
        });
    }

    async createVnpayUrl(paymentId: number, ipAddr: string) {
        const payment = await this.paymentRepo.findOne({
            where: { id: paymentId },
        });
        const now = new Date();

        if (!payment) {
            throw new NotFoundException('Không tìm thấy hóa đơn');
        }

        if (payment.dueDate && payment.dueDate.getTime() < now.getTime()) {
            payment.status = PaymentStatus.OVERDUE;
            await this.paymentRepo.save(payment);

            throw new BadRequestException('Hóa đơn đã quá hạn thanh toán');
        }

        if (payment.status === PaymentStatus.PAID) {
            throw new BadRequestException('Hóa đơn đã thanh toán');
        }

        if (
            payment.status !== PaymentStatus.PENDING &&
            payment.status !== PaymentStatus.FAILED
        ) {
            throw new BadRequestException('Hóa đơn không hợp lệ');
        }

        if (
            payment.status === PaymentStatus.FAILED ||
            payment.status === PaymentStatus.PENDING
        ) {
            payment.code = `${uuidv4()}`;
            payment.transactionRef = null;
            payment.gatewayResponseCode = null;
            payment.paidAt = null;

            await this.paymentRepo.save(payment);
        }

        await this.paymentRepo.save(payment);

        const tmnCode = this.configService.get<string>('vnp_TmnCode');
        const secretKey = this.configService.get<string>('vnp_HashSecret');
        const vnpUrl = this.configService.get<string>('vnp_Url');
        const returnUrl = this.configService.get<string>('vnp_ReturnUrl');

        if (!tmnCode || !secretKey || !vnpUrl || !returnUrl) {
            throw new BadRequestException('Thiếu cấu hình VNPay');
        }

        const createDate = moment().format('YYYYMMDDHHmmss');
        const expireDate = moment().add(15, 'minutes').format('YYYYMMDDHHmmss');

        const vnpParams: Record<string, string> = {
            vnp_Version: '2.1.0',
            vnp_Command: 'pay',
            vnp_TmnCode: tmnCode,
            vnp_Amount: String(Math.round(Number(payment.totalAmount) * 100)),
            vnp_CurrCode: 'VND',
            vnp_TxnRef: payment.code,
            vnp_OrderInfo: `Thanh-toan-hoc-phi-${payment.code}`,
            vnp_OrderType: 'billpayment',
            vnp_Locale: 'vn',
            vnp_ReturnUrl: returnUrl,
            vnp_IpAddr: ipAddr || '127.0.0.1',
            vnp_CreateDate: createDate,
            vnp_ExpireDate: expireDate,
        };

        const sortedParams = sortObject(vnpParams);
        const secureHash = createVnpaySecureHash(sortedParams, secretKey);

        sortedParams.vnp_SecureHash = secureHash;

        const paymentUrl =
            vnpUrl +
            '?' +
            qs.stringify(sortedParams, {
                encode: true,
            });

        return {
            paymentId: payment.id,
            code: payment.code,
            totalAmount: payment.totalAmount,
            paymentUrl,
        };
    }

    async handleVnpayReturn(query: Record<string, string>) {
        const secureHash = query.vnp_SecureHash;

        delete query.vnp_SecureHash;
        delete query.vnp_SecureHashType;

        const sortedParams = sortObject(query);

        const signData = qs.stringify(sortedParams, {
            encode: false,
        });

        const signed = crypto
            .createHmac(
                'sha512',
                this.configService.get<string>('vnp_HashSecret')!,
            )
            .update(Buffer.from(signData, 'utf-8'))
            .digest('hex');

        if (secureHash !== signed) {
            throw new BadRequestException('Sai chữ ký VNPay');
        }

        const payment = await this.paymentRepo.findOne({
            where: {
                code: query.vnp_TxnRef,
            },
        });

        if (!payment) {
            throw new NotFoundException('Không tìm thấy hóa đơn');
        }

        payment.gatewayResponseCode = query.vnp_ResponseCode;
        payment.transactionRef = query.vnp_TransactionNo ?? null;

        if (query.vnp_ResponseCode === '00') {
            payment.status = PaymentStatus.PAID;
            payment.paidAt = new Date();
            payment.transactionRef = query.vnp_TransactionNo;
            payment.gatewayResponseCode = query.vnp_ResponseCode;

            await this.paymentRepo.save(payment);

            const fullPayment = await this.paymentRepo.findOne({
                where: { id: payment.id },
                relations: {
                    student: {
                        user: true,
                    },
                    term: true,
                    items: {
                        courseOffering: {
                            teacherSubject: {
                                subject: true,
                            },
                        },
                    },
                },
            });

            if (!fullPayment) {
                throw new NotFoundException(
                    'Không tìm thấy thông tin thanh toán',
                );
            }

            const studentName = fullPayment.student?.user?.name || 'Sinh viên';
            const studentEmail = fullPayment.student?.user?.email;
            const amount = Number(fullPayment.totalAmount).toLocaleString(
                'vi-VN',
            );

            const admins = await this.userRepo.find({
                where: {
                    role: {
                        name: 'ADMIN',
                    },
                },
                relations: {
                    role: true,
                },
            });

            await Promise.all(
                admins.map((admin) =>
                    this.notificationService.sendToUser(admin.id, {
                        title: 'Thanh toán thành công',
                        content: `${studentName} đã thanh toán ${amount} VND`,
                        type: 'PAYMENT',
                    }),
                ),
            );

            if (fullPayment?.student?.user?.id) {
                const studentUserId = fullPayment.student.user.id;

                for (const item of fullPayment.items || []) {
                    if (item.courseOffering?.id) {
                        await this.chatAppService.openCourseConversationForStudent(
                            item.courseOffering.id,
                            studentUserId,
                        );
                    }
                }
            }

            if (studentEmail) {
                await this.mailerService.sendPaymentSuccessMail({
                    to: studentEmail,
                    studentName,
                    paymentCode: fullPayment.code,
                    transactionRef:
                        fullPayment.transactionRef || query.vnp_TransactionNo,
                    paymentMethod: 'VNPay',
                    termName: `${fullPayment.term.semester} - ${fullPayment.term.year}`,
                    paidAt: new Intl.DateTimeFormat('vi-VN', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                        timeZone: 'Asia/Ho_Chi_Minh',
                    }).format(fullPayment.paidAt ?? new Date()),
                    totalCredits: fullPayment.totalCredits,
                    totalAmount: formatCurrency(fullPayment.totalAmount),
                    items: fullPayment.items.map((item) => ({
                        subjectName:
                            item.courseOffering?.teacherSubject?.subject
                                ?.name || 'Không xác định',
                        subjectCode:
                            item.courseOffering?.teacherSubject?.subject
                                ?.code || 'N/A',
                        credits: item.credits,
                        unitPrice: formatCurrency(item.unitPrice),
                        amount: formatCurrency(item.amount),
                    })),
                });
            }
        } else {
            payment.status = PaymentStatus.FAILED;
            payment.paidAt = null;

            await this.paymentRepo.save(payment);
        }
        return {
            success: query.vnp_ResponseCode === '00',
            responseCode: query.vnp_ResponseCode,
            paymentId: payment.id,
            status: payment.status,
        };
    }
}
