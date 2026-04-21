import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, Min } from 'class-validator';

export class CreateCourseRegistrationDto {
    @IsInt()
    @Min(1)
    courseOfferingId: number;
}

export class CheckCourseRegistrationConflictDto {
    @IsInt()
    courseOfferingId: number;

    @IsOptional()
    @IsArray()
    @Type(() => Number)
    selectedCourseOfferingIds?: number[];
}
