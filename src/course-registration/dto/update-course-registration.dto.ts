import { PartialType } from '@nestjs/mapped-types';
import { CreateCourseRegistrationDto } from './create-course-registration.dto';

export class UpdateCourseRegistrationDto extends PartialType(CreateCourseRegistrationDto) {}
