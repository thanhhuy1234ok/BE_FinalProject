import { Module } from '@nestjs/common';
import { CourseRegistrationService } from './course-registration.service';
import { CourseRegistrationController } from './course-registration.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseRegistration } from './entities/course-registration.entity';
import { Student } from '@/users/entities/student.entity';
import { Schedule } from '@/schedules/entities/schedule.entity';
import { CourseOffering } from '@/course-offering/entities/course-offering.entity';
import { PaymentService } from '@/payment/payment.service';
import { PaymentModule } from '@/payment/payment.module';
import { Term } from '@/terms/entities/term.entity';

@Module({
    controllers: [CourseRegistrationController],
    providers: [CourseRegistrationService],
    imports: [
        TypeOrmModule.forFeature([
            CourseRegistration,
            CourseOffering,
            Schedule,
            Student,
            Term,
        ]),
        PaymentModule,
    ],
})
export class CourseRegistrationModule {}
