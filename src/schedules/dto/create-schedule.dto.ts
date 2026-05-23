import {
    ArrayMinSize,
    IsArray,
    IsDateString,
    IsInt,
    IsNotEmpty,
    IsOptional,
    Max,
    Min,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateScheduleSlotDto {
    @IsOptional()
    @IsInt()
    roomId?: number;

    @IsInt()
    @Min(2)
    @Max(8)
    dayOfWeek: number;

    @IsInt()
    @Min(1)
    @Max(15)
    lessonStart: number;

    @IsInt()
    @Min(1)
    @Max(15)
    lessonEnd: number;
}

export class CreateScheduleDto {
    @IsInt()
    @IsNotEmpty()
    courseOfferingId: number;

    @IsDateString()
    startDate: string;

    @IsDateString()
    endDate: string;

    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => CreateScheduleSlotDto)
    slots: CreateScheduleSlotDto[];
}
