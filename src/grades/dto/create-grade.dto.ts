import { IsNumber, Max, Min } from 'class-validator';

export class CreateGradeDto {
    @IsNumber()
    gradeId: number;

    @IsNumber()
    @Min(0)
    @Max(10)
    midtermScore: number;

    @IsNumber()
    @Min(0)
    @Max(10)
    finalScore: number;
}
