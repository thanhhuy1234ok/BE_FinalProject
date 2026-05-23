import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateSubjectDto {
    @IsString()
    name: string;

    @IsString()
    code: string;

    @IsNumber()
    credit: number;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsNumber()
    department_id: number;
}
