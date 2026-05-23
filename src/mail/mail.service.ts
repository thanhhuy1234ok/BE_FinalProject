import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import { MailerService } from '@nestjs-modules/mailer';
import { JwtService } from '@nestjs/jwt';
import { UpdateInfoDto } from './dto/contentInfo.dto';
import { IUser } from '@/helpers/types/user.interface';

export type PaymentSuccessMailItem = {
    subjectName: string;
    subjectCode: string;
    credits: number;
    unitPrice: string;
    amount: string;
};

export type SendPaymentSuccessMailPayload = {
    to: string;
    studentName: string;
    paymentCode: string;
    transactionRef?: string | null;
    paymentMethod: string;
    termName: string;
    paidAt: string;
    totalCredits: number;
    totalAmount: string;
    items: PaymentSuccessMailItem[];
};

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);
    constructor(
        private mailerService: MailerService,
        private jwtService: JwtService,
    ) {}
    async sendUpdateRequestNotification(user: IUser, req: UpdateInfoDto) {
        const adminEmail = 'demomailok1234@gmail.com';
        if (!user.email) {
            throw new BadRequestException(
                'Không tìm thấy email của người dùng. Không thể gửi email.',
            );
        }
        const approvalLink = `https://schoo-academy.io.vn/admin/test/${req.id}`;
        const emailBody = `
      <p>Sinh viên ${user.name} đã yêu cầu cập nhật thông tin.</p>
      <p>Thông tin: ${JSON.stringify(req.data)}</p>
      <a href="${approvalLink}" target="_blank">Xác nhận thông tin</a>
    `;

        await this.mailerService.sendMail({
            from: user.email,
            to: adminEmail,
            subject: 'Yêu cầu cập nhật thông tin',
            html: emailBody,
        });
    }

    generateApprovalToken(userId: number, updateInfoDto: UpdateInfoDto) {
        const payload = { userId, updateInfo: updateInfoDto };
        return this.jwtService.sign(payload, { expiresIn: '24h' });
    }

    async sendUpdateSuccessEmail(userEmail: string, userName: string) {
        const subject = 'Cập nhật thông tin thành công';
        const body = `
      <p>Xin chào ${userName},</p>
      <p>Thông tin của bạn đã được cập nhật thành công.</p>
      <p>Nếu bạn có bất kỳ thắc mắc nào, vui lòng liên hệ với bộ phận hỗ trợ.</p>
      <p>Trân trọng,</p>
      <p>Đội ngũ quản trị</p>
    `;

        try {
            await this.mailerService.sendMail({
                to: userEmail,
                subject: subject,
                html: body,
            });

            console.log(`Email đã gửi thành công đến ${userEmail}`);
        } catch (error) {
            //@ts-ignore
            console.error(`Gửi email thất bại: ${error.message}`);
        }
    }

    async sendMailRetryPassword(data: any) {
        return await this.mailerService.sendMail({
            to: 'nguyenvothanhhuy2002@gmail.com',
            from: '"Support Team" <support@example.com>', // override default from
            subject: 'Thay đổi mật khẩu',
            template: 'retrypass',
            context: {
                name: data.name,
                activationCode: data.codeId,
            },
        });
    }

    async sendPaymentSuccessMail(payload: SendPaymentSuccessMailPayload) {
        try {
            await this.mailerService.sendMail({
                to: payload.to,
                subject: `Thanh toán học phí thành công - ${payload.paymentCode}`,
                template: 'payment-success',
                context: {
                    studentName: payload.studentName,
                    paymentCode: payload.paymentCode,
                    transactionRef: payload.transactionRef || 'Không có',
                    paymentMethod: payload.paymentMethod,
                    termName: payload.termName,
                    paidAt: payload.paidAt,
                    totalCredits: payload.totalCredits,
                    totalAmount: payload.totalAmount,
                    items: payload.items,
                },
            });

            this.logger.log(`Sent payment success mail to ${payload.to}`);
        } catch (error) {
            this.logger.error(
                `Failed to send payment success mail to ${payload.to}`,
                error,
            );
        }
    }
}
