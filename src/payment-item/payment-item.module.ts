import { Module } from '@nestjs/common';
import { PaymentItemService } from './payment-item.service';
import { PaymentItemController } from './payment-item.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentItem } from './entities/payment-item.entity';

@Module({
    controllers: [PaymentItemController],
    providers: [PaymentItemService],
    imports: [TypeOrmModule.forFeature([PaymentItem])],

    exports: [PaymentItemService],
})
export class PaymentItemModule {}
