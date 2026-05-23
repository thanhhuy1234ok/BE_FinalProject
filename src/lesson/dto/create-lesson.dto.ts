import { IsDateString, IsOptional } from 'class-validator';

export class CreateLessonDto {}

export class QueryStudentLessonsDto {
    @IsDateString()
    date: string;

    @IsOptional()
    keyword?: string;
}
