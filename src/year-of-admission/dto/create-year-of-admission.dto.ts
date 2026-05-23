import { IsNumber, IsOptional, IsString } from "class-validator";

export class CreateYearOfAdmissionDto {
  @IsNumber()
  year: number;

  @IsOptional()
  @IsString()
  code?: string;

  @IsNumber()
  expectedGraduationYear: number;

  @IsOptional()
  @IsString()
  description?: string;
}
