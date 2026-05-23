// src/curriculums/dto/create-curriculum.dto.ts
import {
    IsArray,
    IsBoolean,
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

    // ====== DANH SÁCH MÔN TRONG CTĐT ======
    //   @IsOptional()
    //   @IsArray()
    //   @ValidateNested({ each: true })
    //   @Type(() => CreateCurriculumSubjectDto)
    //   subjects?: CreateCurriculumSubjectDto[];
}
