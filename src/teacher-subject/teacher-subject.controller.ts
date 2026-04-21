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
import { TeacherSubjectService } from './teacher-subject.service';
import {
    CreateTeacherSubjectDto,
    CreateTeacherSubjectManyDto,
} from './dto/create-teacher-subject.dto';
import { UpdateTeacherSubjectDto } from './dto/update-teacher-subject.dto';

@Controller('teacher-subject')
export class TeacherSubjectController {
    constructor(
        private readonly teacherSubjectService: TeacherSubjectService,
    ) {}

    // @Post()
    // create(@Body() createTeacherSubjectDto: CreateTeacherSubjectDto) {
    //     return this.teacherSubjectService.create(createTeacherSubjectDto);
    // }

    @Post('many-sub')
    createMany(@Body() createTeacherSubjectDto: CreateTeacherSubjectManyDto) {
        return this.teacherSubjectService.createManySub(
            createTeacherSubjectDto,
        );
    }

    @Get()
    findAll(
        @Query('current') current = '1',
        @Query('pageSize') pageSize = '10',
        @Query() query: Record<string, string>,
    ) {
        const { current: _current, pageSize: _pageSize, ...rest } = query;

        const qs = new URLSearchParams(rest).toString();

        return this.teacherSubjectService.findAll(
            Number(current),
            Number(pageSize),
            qs,
        );
    }
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.teacherSubjectService.findOne(+id);
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() updateTeacherSubjectDto: UpdateTeacherSubjectDto,
    ) {
        return this.teacherSubjectService.update(+id, updateTeacherSubjectDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.teacherSubjectService.remove(+id);
    }
}
