import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PaymentItemService } from './payment-item.service';
import { CreatePaymentItemDto } from './dto/create-payment-item.dto';
import { UpdatePaymentItemDto } from './dto/update-payment-item.dto';

@Controller('payment-item')
export class PaymentItemController {
  constructor(private readonly paymentItemService: PaymentItemService) {}

  @Post()
  create(@Body() createPaymentItemDto: CreatePaymentItemDto) {
    return this.paymentItemService.create(createPaymentItemDto);
  }

  @Get()
  findAll() {
    return this.paymentItemService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.paymentItemService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePaymentItemDto: UpdatePaymentItemDto) {
    return this.paymentItemService.update(+id, updatePaymentItemDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.paymentItemService.remove(+id);
  }
}
