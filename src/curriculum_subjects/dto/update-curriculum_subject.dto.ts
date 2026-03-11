import { PartialType } from '@nestjs/mapped-types';
import { CreateCurriculumSubjectDto } from './create-curriculum_subject.dto';

export class UpdateCurriculumSubjectDto extends PartialType(CreateCurriculumSubjectDto) {}
