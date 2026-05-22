import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
} from '@nestjs/common';
import { PaymentItemService } from './payment-item.service';
import { CreatePaymentItemDto } from './dto/create-payment-item.dto';
import { UpdatePaymentItemDto } from './dto/update-payment-item.dto';

@Controller('payment-item')
export class PaymentItemController {
    constructor(private readonly paymentItemService: PaymentItemService) {}
}
