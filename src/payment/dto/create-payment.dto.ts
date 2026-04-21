import { PaymentMethod } from '@/helpers/enum/enum.global';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class PayPaymentDto {
    @IsEnum(PaymentMethod)
    paymentMethod: PaymentMethod;

    @IsOptional()
    @IsString()
    note?: string;
}
