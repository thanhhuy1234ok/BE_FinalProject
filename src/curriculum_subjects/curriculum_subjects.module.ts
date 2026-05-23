import { Module } from '@nestjs/common';
import { CurriculumSubjectsService } from './curriculum_subjects.service';
import { CurriculumSubjectsController } from './curriculum_subjects.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CurriculumSubject } from './entities/curriculum_subject.entity';
import { Curriculum } from '@/curriculum/entities/curriculum.entity';
import { Subject } from '@/subjects/entities/subject.entity';
import { Major } from '@/majors/entities/major.entity';
import { YearOfAdmission } from '@/year-of-admission/entities/year-of-admission.entity';

@Module({
    controllers: [CurriculumSubjectsController],
    providers: [CurriculumSubjectsService],
    imports: [
        TypeOrmModule.forFeature([
            CurriculumSubject,
            Curriculum,
            Subject,
            Major,
            YearOfAdmission,
        ]),
    ],
})
export class CurriculumSubjectsModule {}
