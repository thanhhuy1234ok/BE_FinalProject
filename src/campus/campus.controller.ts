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
import { CampusService } from './campus.service';
import { CreateCampusDto } from './dto/create-campus.dto';
import { UpdateCampusDto } from './dto/update-campus.dto';
import { BuildingService } from '@/building/building.service';
import { CreateBuildingDto } from '@/building/dto/create-building.dto';

@Controller('campus')
export class CampusController {
    constructor(
        private readonly campusService: CampusService,
        private readonly buildingService: BuildingService,
    ) {}

    @Post()
    create(@Body() createCampusDto: CreateCampusDto) {
        return this.campusService.create(createCampusDto);
    }

    @Get()
    findAll(
        @Query('current') currentPage: string,
        @Query('pageSize') limit: string,
        @Query() qs: string,
    ) {
        return this.campusService.findAll(+currentPage, +limit, qs);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.campusService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateCampusDto: UpdateCampusDto) {
        return this.campusService.update(+id, updateCampusDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.campusService.remove(+id);
    }

    @Post(':CampusId/buildings')
    createBuilding(
        @Param('CampusId') campus_id: number,
        @Body() createBuildingDto: CreateBuildingDto,
    ) {
        return this.buildingService.create(+campus_id, createBuildingDto);
    }
}
