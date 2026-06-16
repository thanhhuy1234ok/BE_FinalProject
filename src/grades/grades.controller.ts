import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
} from '@nestjs/common';
import { GradesService } from './grades.service';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';
import { User } from '@/helpers/decorator/customize';
import type { IUser } from '@/helpers/types/user.interface';

@Controller('grades')
export class GradesController {
    constructor(private readonly gradesService: GradesService) {}

    @Patch()
    updateGrade(@User() req: IUser, @Body() dto: UpdateGradeDto) {
        return this.gradesService.updateGrade(req.id, dto);
    }

    @Get('my')
    getMyGrades(@User() req: IUser) {
        return this.gradesService.getMyGrades(req.id);
    }

    @Get('my-mobile')
    getMyMobileGrades(@User() req: IUser) {
        return this.gradesService.getMyMobileGrades(req.id);
    }

    @Get('my-results')
    getMyResults(@User() req: IUser) {
        return this.gradesService.getMyResults(req.id);
    }

    @Patch('publish/:courseOfferingId')
    publishGrades(@Param('courseOfferingId') courseOfferingId: string) {
        return this.gradesService.publishGrades(Number(courseOfferingId));
    }

    @Get('my-study-results')
    getMyStudyResults(
        @User() req: IUser,
        @Query('keyword') keyword?: string,
        @Query('termId') termId?: string,
    ) {
        return this.gradesService.getMyStudyResults(req.id, {
            keyword,
            termId: termId ? Number(termId) : undefined,
        });
    }
}
