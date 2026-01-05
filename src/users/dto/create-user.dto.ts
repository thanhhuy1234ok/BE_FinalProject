import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateUserDto {
  @IsString()
  name: string;
  @IsString()
  email: string;
  @IsString()
  password: string;

  @IsString()
  @IsOptional()
  gender?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsNumber()
  role: number;

  // Cho STUDENT

  @IsNumber()
  @IsOptional()
  major_id?: number;

  @IsNumber()
  @IsOptional()
  class_id?: number;

  @IsNumber()
  @IsOptional()
  yearOfAdmissionId?: number;

  // Cho TEACHER
  specialization?: string;
  degree?: string;
  working_hours?: number;
}
