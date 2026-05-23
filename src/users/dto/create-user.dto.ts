import { Type } from 'class-transformer';
import {
    ArrayMinSize,
    IsArray,
    IsEmail,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Min,
    ValidateNested,
} from 'class-validator';

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

export class ImportStudentExcelItemDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsEmail()
    email: string;

    @IsString()
    @IsNotEmpty()
    password: string;

    @IsString()
    @IsNotEmpty()
    gender: string;

    @IsString()
    @IsNotEmpty()
    majorName: string;

    @IsOptional()
    @IsString()
    // @IsNotEmpty()
    className: string;

    @Type(() => Number)
    @IsInt()
    @Min(2000)
    yearAdmission: number;

    @IsOptional()
    @IsString()
    phone?: string;
}

export class ImportStudentExcelDto {
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => ImportStudentExcelItemDto)
    items: ImportStudentExcelItemDto[];
}

export class ImportTeacherExcelItemDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsEmail()
    email: string;

    @IsString()
    @IsNotEmpty()
    password: string;

    @IsString()
    @IsNotEmpty()
    gender: string;

    @IsString()
    @IsNotEmpty()
    departmentName: string;

    @IsOptional()
    @IsString()
    specialization?: string;

    @IsOptional()
    @IsString()
    phone?: string;
}

export class ImportTeacherExcelDto {
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => ImportTeacherExcelItemDto)
    items: ImportTeacherExcelItemDto[];
}
