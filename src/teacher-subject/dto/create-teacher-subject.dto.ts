import { IsArray, IsNumber, IsString } from 'class-validator';

export class CreateTeacherSubjectDto {
    @IsNumber()
    teacherId: number;
    @IsNumber()
    subjectId: number;
}

export class CreateTeacherSubjectManyDto {
    @IsNumber()
    teacherId: number;
    @IsArray()
    subjectIds: number[];
}
