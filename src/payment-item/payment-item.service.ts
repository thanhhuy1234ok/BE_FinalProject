import { Injectable } from '@nestjs/common';
import { CreatePaymentItemDto } from './dto/create-payment-item.dto';
import { UpdatePaymentItemDto } from './dto/update-payment-item.dto';

@Injectable()
export class PaymentItemService {
  create(createPaymentItemDto: CreatePaymentItemDto) {
    return 'This action adds a new paymentItem';
  }

  findAll() {
    return `This action returns all paymentItem`;
  }

  findOne(id: number) {
    return `This action returns a #${id} paymentItem`;
  }

  update(id: number, updatePaymentItemDto: UpdatePaymentItemDto) {
    return `This action updates a #${id} paymentItem`;
  }

  remove(id: number) {
    return `This action removes a #${id} paymentItem`;
  }
}
