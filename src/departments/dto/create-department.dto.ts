import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDepartmentDto {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    code?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    isActive: boolean;

    @IsInt()
    facultyId: number;
}
