import { PartialType } from '@nestjs/mapped-types';
import { CreateTeacherSubjectDto } from './create-teacher-subject.dto';

export class UpdateTeacherSubjectDto extends PartialType(CreateTeacherSubjectDto) {}
