import { PartialType } from '@nestjs/mapped-types';
import { CreateAdminClassAdvisorDto } from './create-admin-class-advisor.dto';

export class UpdateAdminClassAdvisorDto extends PartialType(CreateAdminClassAdvisorDto) {}
