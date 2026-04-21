import { PartialType } from '@nestjs/mapped-types';
import { CreatePaymentItemDto } from './create-payment-item.dto';

export class UpdatePaymentItemDto extends PartialType(CreatePaymentItemDto) {}
