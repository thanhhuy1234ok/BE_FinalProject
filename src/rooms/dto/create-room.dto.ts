import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateRoomDto {
    @IsNotEmpty()
    @IsNumber()
    building_id: number;

    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsNumber()
    floor?: number;

    @IsOptional()
    @IsNumber()
    capacity?: number;

    @IsOptional()
    @IsString()
    type?: string;
}
