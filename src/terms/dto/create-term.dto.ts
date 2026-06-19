import { SemesterEnum } from '@/helpers/enum/enum.global';
import {
    IsBoolean,
    IsDate,
    IsDateString,
    IsEnum,
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    Min,
} from 'class-validator';

export class CreateTermDto {
    @IsInt()
    @Min(2000)
    @Max(2100)
    year: number;

    @IsEnum(SemesterEnum)
    semester: SemesterEnum;

    @IsDateString()
    startDate: string;

    @IsDateString()
    endDate: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
