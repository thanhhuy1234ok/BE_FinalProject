import { PartialType } from '@nestjs/mapped-types';
import { CreateYearOfAdmissionDto } from './create-year-of-admission.dto';

export class UpdateYearOfAdmissionDto extends PartialType(CreateYearOfAdmissionDto) {}
