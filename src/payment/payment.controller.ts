import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Req,
    ParseIntPipe,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { ResponseMessage } from '@/helpers/decorator/customize';
import { PayPaymentDto } from './dto/create-payment.dto';

@Controller('payment')
export class PaymentController {
    constructor(private readonly paymentsService: PaymentService) {}

    @Post('registrations/:registrationId/attach')
    @ResponseMessage('Cập nhật phiếu thanh toán thành công')
    attachRegistrationToPayment(
        @Param('registrationId', ParseIntPipe) registrationId: number,
    ) {
        return this.paymentsService.attachRegistrationToPayment(registrationId);
    }

    @Patch('registrations/:registrationId/cancel')
    @ResponseMessage('Hủy đăng ký môn thành công')
    cancelRegistrationAndUpdatePayment(
        @Req() req: any,
        @Param('registrationId', ParseIntPipe) registrationId: number,
    ) {
        return this.paymentsService.cancelRegistrationAndUpdatePayment(
            req.user.id,
            registrationId,
        );
    }

    @Get('my-current')
    @ResponseMessage('Lấy phiếu thanh toán hiện tại thành công')
    getMyCurrent(@Req() req: any) {
        return this.paymentsService.getMyCurrent(req.user.id);
    }

    @Get(':id')
    @ResponseMessage('Lấy chi tiết phiếu thanh toán thành công')
    getDetail(@Param('id', ParseIntPipe) id: number) {
        return this.paymentsService.getPaymentDetail(id);
    }

    @Patch(':id/pay')
    @ResponseMessage('Thanh toán thành công')
    pay(
        @Req() req: any,
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: PayPaymentDto,
    ) {
        return this.paymentsService.pay(req.user.id, id, dto);
    }
}
