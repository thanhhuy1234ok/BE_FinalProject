import { IsBoolean, IsOptional, IsString } from "class-validator";

export class CreateBuildingDto {
    @IsString()
    code: string;

    @IsOptional()
    @IsBoolean()
    has_floors?: boolean;

    @IsOptional()
    total_floors?: number;

    @IsString()
    name: string;
}
