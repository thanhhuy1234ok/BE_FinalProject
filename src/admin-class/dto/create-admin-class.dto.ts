import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateAdminClassDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;
  @IsNumber()
  yearOfAdmissionId: number;

  @IsNumber()
  major_id: number;

  @IsOptional()
  @IsNumber()
  capacity: number;

  @IsOptional()
  @IsNumber()
  homeroomTeacherId: number;
}
