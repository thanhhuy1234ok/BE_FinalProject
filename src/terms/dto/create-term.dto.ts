import { IsDate, IsDateString, IsInt, IsNumber, IsString, Max, Min } from "class-validator";

export class CreateTermDto {
    @IsString()
    name: string;

    @IsString()
    code: string;

    @IsDateString()
    startDate: string;

    @IsDateString()
    endDate: string;

    @IsInt()
    year: number;

    @IsInt()
    @Min(1)
    @Max(4)
    semester: number;


}
