import { Module } from '@nestjs/common';
import { CurriculumService } from './curriculum.service';
import { CurriculumController } from './curriculum.controller';
import { Curriculum } from './entities/curriculum.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { YearOfAdmission } from '@/year-of-admission/entities/year-of-admission.entity';
import { Major } from '@/majors/entities/major.entity';

@Module({
    controllers: [CurriculumController],
    providers: [CurriculumService],
    imports: [TypeOrmModule.forFeature([Curriculum, Major, YearOfAdmission])],
})
export class CurriculumModule {}
