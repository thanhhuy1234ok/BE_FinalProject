import { IsNumber, IsOptional, IsString } from "class-validator";

export class CreateYearOfAdmissionDto {
  @IsNumber()
  year: number;

  @IsString()
  code: string;

  @IsNumber()
  expectedGraduationYear: number;

  @IsOptional()
  @IsString()
  description?: string;
}
