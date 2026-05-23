import { Type } from 'class-transformer';
import {
    ArrayNotEmpty,
    IsArray,
    IsInt,
    IsNumber,
    IsOptional,
    Min,
} from 'class-validator';

export class CreateCourseRegistrationDto {
    @IsArray()
    @ArrayNotEmpty() // ✅ không cho gửi []
    @IsInt({ each: true })
    @Type(() => Number) // 🔥 QUAN TRỌNG (transform string -> number)
    courseOfferingIds: number[];
}

export class CheckCourseRegistrationConflictDto {
    @IsNumber()
    courseOfferingId: number;

    @IsOptional()
    @IsArray()
    @IsNumber({}, { each: true })
    selectedCourseOfferingIds?: number[];
}
