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
import { CurriculumSubjectsService } from './curriculum_subjects.service';
import {
    CreateCurriculumSubjectDto,
    CreateCurriculumSubjectsBulkDto,
    ImportCurriculumSubjectExcelDto,
    ImportCurriculumSubjectExcelNameDto,
} from './dto/create-curriculum_subject.dto';
import { UpdateCurriculumSubjectDto } from './dto/update-curriculum_subject.dto';

@Controller('curriculum-subjects')
export class CurriculumSubjectsController {
    constructor(
        private readonly curriculumSubjectsService: CurriculumSubjectsService,
    ) {}

    @Post()
    create(@Body() createCurriculumSubjectDto: CreateCurriculumSubjectDto) {
        return this.curriculumSubjectsService.create(
            createCurriculumSubjectDto,
        );
    }
    @Post('bulk')
    createBulk(
        @Body()
        createCurriculumSubjectsBulkDto: ImportCurriculumSubjectExcelDto,
    ) {
        return this.curriculumSubjectsService.importCurriculumSubjects(
            createCurriculumSubjectsBulkDto,
        );
    }
    @Post('bulkName')
    createBulkName(
        @Body()
        createCurriculumSubjectsBulkDto: ImportCurriculumSubjectExcelNameDto,
    ) {
        return this.curriculumSubjectsService.importCurriculumSubjectsName(
            createCurriculumSubjectsBulkDto,
        );
    }

    @Get()
    findAll(
        @Query('current') currentPage: string,
        @Query('pageSize') limit: string,
        @Query() qs: string,
    ) {
        return this.curriculumSubjectsService.findAll(+currentPage, +limit, qs);
    }
}
