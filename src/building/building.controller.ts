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
import { BuildingService } from './building.service';
import { UpdateBuildingDto } from './dto/update-building.dto';

@Controller('building')
export class BuildingController {
    constructor(private readonly buildingService: BuildingService) {}

    @Get()
    async findAll(
        @Query('current') current = 1,
        @Query('pageSize') pageSize = 10,
        @Query() qs: string,
    ) {
        return this.buildingService.findAll(+current, +pageSize, qs);
    }
}
