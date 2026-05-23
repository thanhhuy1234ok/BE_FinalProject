import { CourseOfferingStatus } from '@/helpers/enum/enum.global';
import { Type } from 'class-transformer';
import {
    ArrayMinSize,
    IsArray,
    IsBoolean,
    IsInt,
    IsOptional,
    Min,
} from 'class-validator';

export class CreateCourseOfferingDto {
    @IsInt()
    teacherSubjectId: number;

    @IsInt()
    termId: number;

    @IsOptional()
    @IsInt()
    adminClassId?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    maxStudents?: number;
}
export class UpdateCourseOfferingStatusDto {
    status: CourseOfferingStatus;
}

export class BulkUpdateCourseOfferingStatusDto {
    @IsArray()
    @ArrayMinSize(1)
    @Type(() => Number)
    @IsInt({ each: true })
    ids: number[];
}
