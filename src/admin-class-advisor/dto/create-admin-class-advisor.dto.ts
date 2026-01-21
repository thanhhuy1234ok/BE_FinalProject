import { IsBoolean, IsInt, IsISO8601, IsOptional } from "class-validator";

export class CreateAdminClassAdvisorDto {

    @IsInt()
    adminClassId: number;

    @IsInt()
    teacherId: number;

    @IsOptional()
    @IsISO8601()
    startAt?: string;

    @IsOptional()
    @IsBoolean()
    isPrimary?: boolean;
}
