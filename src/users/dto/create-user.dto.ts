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
    @IsString()
    @IsOptional()
    specialization?: string;

    @IsString()
    @IsOptional()
    degree?: string;

    @IsNumber()
    @IsOptional()
    departmentId?: number;
}
