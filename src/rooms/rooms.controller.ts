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
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

@Controller('rooms')
export class RoomsController {
    constructor(private readonly roomsService: RoomsService) {}

    @Post()
    create(@Body() createRoomDto: CreateRoomDto) {
        return this.roomsService.create(createRoomDto);
    }

    @Get()
    findAll(
        @Query('current') currentPage: string,
        @Query('pageSize') limit: string,
        @Query() qs: string,
    ) {
        return this.roomsService.findAll(
            parseInt(currentPage) || 1,
            parseInt(limit) || 10,
            qs,
        );
    }

    @Get('preview-code')
    async previewCode(
        @Query('building_id') buildingId: number,
        @Query('floor') floor?: number,
    ) {
        return this.roomsService.previewRoomCode(
            +buildingId,
            floor ? +floor : null,
        );
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.roomsService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateRoomDto: UpdateRoomDto) {
        return this.roomsService.update(+id, updateRoomDto);
    }
}
