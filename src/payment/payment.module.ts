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
import { NotificationModule } from '@/notification/notification.module';
import { User } from '@/users/entities/user.entity';
import { MailModule } from '@/mail/mail.module';
import { ChatAppModule } from '@/chat-app/chat-app.module';
import { Grade } from '@/grades/entities/grade.entity';

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
            User,
            Grade,
        ]),
        NotificationModule,
        MailModule,
        ChatAppModule,
    ],
    exports: [PaymentService],
})
export class PaymentModule {}
