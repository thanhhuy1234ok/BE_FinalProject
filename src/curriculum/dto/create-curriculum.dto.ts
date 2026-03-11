// src/curriculums/dto/create-curriculum.dto.ts
import {
    IsArray,
    IsDateString,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    Min,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CurriculumStatus } from '../entities/curriculum.entity';

export class CreateCurriculumDto {
    @IsInt()
    majorId: number;

    @IsInt()
    yearOfAdmissionId: number;

    @IsOptional()
    @IsString()
    version?: string; // default v1 nếu không gửi

    @IsOptional()
    @IsDateString()
    effective_from?: string;

    @IsOptional()
    @IsDateString()
    effective_to?: string;

    @IsOptional()
    @IsInt()
    total_credits_required?: number;

    @IsOptional()
    @IsEnum(CurriculumStatus)
    status?: CurriculumStatus;

    @IsOptional()
    @IsString()
    notes?: string;

    // ====== DANH SÁCH MÔN TRONG CTĐT ======
    //   @IsOptional()
    //   @IsArray()
    //   @ValidateNested({ each: true })
    //   @Type(() => CreateCurriculumSubjectDto)
    //   subjects?: CreateCurriculumSubjectDto[];
}
