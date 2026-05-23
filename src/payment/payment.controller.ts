import {
    Controller,
    Get,
    Post,
    Patch,
    Param,
    ParseIntPipe,
    Query,
    Body,
    Req,
    Res,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { Public, ResponseMessage, User } from '@/helpers/decorator/customize';
import type { IUser } from '@/helpers/types/user.interface';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
@Controller('payments')
export class PaymentController {
    constructor(
        private readonly paymentService: PaymentService,
        private configService: ConfigService,
    ) {}

    @Get('registered-courses')
    getRegisteredCoursesForPayment(@User() user: IUser) {
        return this.paymentService.getRegisteredCoursesForPayment(user.id);
    }

    @Post(':paymentId/vnpay/create-url')
    createVNPayUrl(
        @Req() req: Request,
        @Param('paymentId', ParseIntPipe) paymentId: number,
    ) {
        const forwarded = req.headers['x-forwarded-for'];

        let ip =
            typeof forwarded === 'string'
                ? forwarded.split(',')[0].trim()
                : req.socket?.remoteAddress || '127.0.0.1';

        // normalize IPv6
        if (ip === '::1') ip = '127.0.0.1';
        if (ip.startsWith('::ffff:')) ip = ip.replace('::ffff:', '');

        const finalIp = ip;

        return this.paymentService.createVnpayUrl(paymentId, finalIp);
    }

    @Post('invoice')
    createInvoice(@User() user: IUser) {
        return this.paymentService.createInvoice(user.id);
    }

    @Public()
    @Get('vnpay/return-url')
    async vnpayReturn(
        @Query() query: Record<string, string>,
        @Res() res: Response,
    ) {
        const result = await this.paymentService.handleVnpayReturn(query);

        const feUrl =
            this.configService.get<string>('FRONT_END_URL') ||
            'http://localhost:3000';

        const redirectUrl = `${feUrl}/vn-pay/return-url?paymentId=${result.paymentId}&status=${result.status}&responseCode=${result.responseCode}`;

        return res.redirect(redirectUrl);
    }
}
