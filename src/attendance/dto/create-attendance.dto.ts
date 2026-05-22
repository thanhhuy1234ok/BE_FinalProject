import { AttendanceStatus } from '@/helpers/enum/enum.global';
import {
    ArrayNotEmpty,
    IsArray,
    IsEnum,
    IsInt,
    IsJWT,
    IsLatitude,
    IsLongitude,
    IsOptional,
    IsString,
} from 'class-validator';

export class MarkAttendanceDto {
    @IsInt()
    registrationId: number;

    @IsEnum(AttendanceStatus)
    status: AttendanceStatus;

    @IsOptional()
    @IsString()
    note?: string;
}

export class BulkAttendanceDto {
    @IsArray()
    @ArrayNotEmpty()
    @IsInt({ each: true })
    registrationIds: number[];

    @IsEnum(AttendanceStatus)
    status: AttendanceStatus;
}

export class GenerateAttendanceQRDto {
    @IsOptional()
    @IsLatitude()
    latitude?: number;

    @IsOptional()
    @IsLongitude()
    longitude?: number;
}
export class ScanAttendanceQRDto {
    @IsJWT()
    token: string;

    @IsOptional()
    @IsLatitude()
    latitude?: number;

    @IsOptional()
    @IsLongitude()
    longitude?: number;

    @IsOptional()
    @IsInt()
    lessonId?: number;
}
