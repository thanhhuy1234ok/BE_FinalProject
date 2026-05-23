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
import { CurriculumService } from './curriculum.service';
import { CreateCurriculumDto } from './dto/create-curriculum.dto';
import { UpdateCurriculumDto } from './dto/update-curriculum.dto';

@Controller('curriculum')
export class CurriculumController {
    constructor(private readonly curriculumService: CurriculumService) {}

    @Post()
    create(@Body() createCurriculumDto: CreateCurriculumDto) {
        return this.curriculumService.create(createCurriculumDto);
    }

    @Post('preview-name-code')
    previewNameCode(
        @Body() body: { majorId: number; yearOfAdmissionId: number },
    ) {
        const { majorId, yearOfAdmissionId } = body;
        return this.curriculumService.generateCurriculumNameCode(
            majorId,
            yearOfAdmissionId,
        );
    }

    @Get()
    findAll(
        @Query('current') currentPage: string,
        @Query('pageSize') limit: string,
        @Query() qs: string,
    ) {
        return this.curriculumService.findAll(+currentPage, +limit, qs);
    }
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.curriculumService.findOne(+id);
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() updateCurriculumDto: UpdateCurriculumDto,
    ) {
        return this.curriculumService.update(+id, updateCurriculumDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.curriculumService.remove(+id);
    }
}
