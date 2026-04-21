import { IsArray, IsNumber, IsString } from 'class-validator';

export class CreateTeacherSubjectDto {
    @IsNumber()
    teacherId: number;
    @IsNumber()
    subjectId: number;
}

export class CreateTeacherSubjectManyDto {
    @IsString()
    teacherId: string;
    @IsArray()
    subjectIds: number[];
}
