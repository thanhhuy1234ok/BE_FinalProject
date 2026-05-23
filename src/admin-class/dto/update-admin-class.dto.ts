import { PartialType } from '@nestjs/mapped-types';
import { CreateAdminClassDto } from './create-admin-class.dto';

export class UpdateAdminClassDto extends PartialType(CreateAdminClassDto) {}
