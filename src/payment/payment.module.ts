import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { Payment } from './entities/payment.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentItem } from '@/payment-item/entities/payment-item.entity';
import { CourseRegistration } from '@/course-registration/entities/course-registration.entity';
import { Student } from '@/users/entities/student.entity';
import { CourseOffering } from '@/course-offering/entities/course-offering.entity';
import { Term } from '@/terms/entities/term.entity';

@Module({
    controllers: [PaymentController],
    providers: [PaymentService],
    imports: [
        TypeOrmModule.forFeature([
            Payment,
            PaymentItem,
            CourseRegistration,
            Student,
            CourseOffering,
            Term,
        ]),
    ],
    exports: [PaymentService],
})
export class PaymentModule {}
