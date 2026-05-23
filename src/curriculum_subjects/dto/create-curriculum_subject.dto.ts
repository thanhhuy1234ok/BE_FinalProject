import { Transform, Type } from 'class-transformer';
import {
    ArrayMinSize,
    IsArray,
    IsBoolean,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    Min,
    ValidateNested,
} from 'class-validator';

export class CreateCurriculumSubjectDto {
    @IsInt()
    curriculumId: number;

    @IsInt()
    subjectId: number;

    @IsInt()
    @Min(1)
    year: number;

    @IsInt()
    @Min(1)
    semester: number;

    @IsOptional()
    @IsBoolean()
    isRequired?: boolean;

    @IsOptional()
    @IsString()
    groupCode?: string;

    @IsOptional()
    @IsInt()
    creditsOverride?: number;

    @IsOptional()
    @IsInt()
    ordering?: number;

    @IsOptional()
    @IsString()
    prerequisiteRule?: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class CreateCurriculumSubjectsBulkDto {
    @IsInt()
    @Min(1)
    curriculumId: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SemesterSubjectsDto)
    terms: SemesterSubjectsDto[];
}

export class SemesterSubjectsDto {
    @IsInt()
    @Min(1)
    year: number;

    @IsInt()
    @Min(1)
    semester: number;

    @IsArray()
    @IsInt({ each: true })
    subjectIds: number[];

    @IsOptional()
    isRequired?: boolean;

    @IsOptional()
    groupCode?: string;

    @IsOptional()
    creditsOverride?: number;

    @IsOptional()
    ordering?: number; // nếu muốn chung cho cả block
    @IsOptional()
    @IsString()
    prerequisiteRule?: string;
}

export class CreateCurriculumSubjectsBulkDtoV2 {
    @IsInt()
    @Min(1)
    curriculumId: number;

    @IsInt()
    @Min(1)
    year: number;

    @IsInt()
    @Min(1)
    semester: number;

    @IsArray()
    @IsInt({ each: true })
    subjectId: number;

    @IsOptional()
    isRequired?: boolean;

    @IsOptional()
    groupCode?: string;

    @IsOptional()
    creditsOverride?: number;

    @IsOptional()
    ordering?: number; // nếu muốn chung cho cả block

    @IsOptional()
    @IsString()
    prerequisiteRule?: string;
}

export class ImportCurriculumSubjectExcelRowDto {
    @Transform(({ obj }) => obj['Chương trình đào tạo ID'] ?? obj.curriculumId)
    @Type(() => Number)
    @IsInt()
    @Min(1)
    curriculumId: number;

    @Transform(({ obj }) => obj['Môn học ID'] ?? obj.subjectId)
    @Type(() => Number)
    @IsInt()
    @Min(1)
    subjectId: number;

    @Transform(({ obj }) => obj['Học kỳ'] ?? obj.semesterNumber)
    @Type(() => Number)
    @IsInt()
    @Min(1)
    semesterNumber: number;

    @Transform(({ obj }) => obj['Bắt buộc'] ?? obj.isRequired)
    @IsOptional()
    @Transform(({ value }) => {
        if (value === true || value === 'true' || value === 1 || value === '1')
            return true;
        if (
            value === false ||
            value === 'false' ||
            value === 0 ||
            value === '0'
        )
            return false;
        return true;
    })
    @IsBoolean()
    isRequired?: boolean = true;

    @Transform(({ obj }) => obj['Thứ tự'] ?? obj.ordering)
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    ordering?: number = 0;
}

export class ImportCurriculumSubjectExcelDto {
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => ImportCurriculumSubjectExcelRowDto)
    items: ImportCurriculumSubjectExcelRowDto[];
}

export class ImportCurriculumSubjectExcelRowNameDto {
    @Transform(
        ({ obj, value }) =>
            obj['Tên chương trình đào tạo'] ?? obj.curriculumName ?? value,
    )
    @IsString()
    @IsNotEmpty()
    curriculumName: string;

    @Transform(
        ({ obj, value }) => obj['Tên môn học'] ?? obj.subjectName ?? value,
    )
    @IsString()
    @IsNotEmpty()
    subjectName: string;

    @Transform(({ obj, value }) => obj['Học kỳ'] ?? obj.semesterNumber ?? value)
    @Type(() => Number)
    @IsInt()
    @Min(1)
    semesterNumber: number;

    @Transform(({ obj, value }) => obj['Bắt buộc'] ?? obj.isRequired ?? value)
    @IsOptional()
    @Transform(({ value }) => {
        if (value === true || value === 'true' || value === 1 || value === '1')
            return true;
        if (
            value === false ||
            value === 'false' ||
            value === 0 ||
            value === '0'
        )
            return false;
        return true;
    })
    @IsBoolean()
    isRequired?: boolean;

    @Transform(({ obj, value }) => obj['Thứ tự'] ?? obj.ordering ?? value)
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    ordering?: number;

    @Transform(
        ({ obj, value }) =>
            obj['Điều kiện học'] ?? obj.prerequisiteRule ?? value,
    )
    @IsOptional()
    @IsString()
    prerequisiteRule: string;
}

export class ImportCurriculumSubjectExcelNameDto {
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => ImportCurriculumSubjectExcelRowNameDto)
    items: ImportCurriculumSubjectExcelRowNameDto[];
}
