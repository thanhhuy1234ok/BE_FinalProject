import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateBuildingDto } from './dto/create-building.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Building } from './entities/building.entity';
import { Repository } from 'typeorm';
import { Campus } from '@/campus/entities/campus.entity';

@Injectable()
export class BuildingService {
  constructor(
    @InjectRepository(Building)
    private buildingRepository: Repository<Building>,

    @InjectRepository(Campus)
    private campusRepository: Repository<Campus>,
  ) {}
  async create(campus_id: number, createBuildingDto: CreateBuildingDto) {
    const campus = await this.campusRepository.findOne({
      where: { id: campus_id, is_active: true },
    });

    if (!campus) {
      throw new NotFoundException('Campus not found or inactive');
    }

    const hasFloors = createBuildingDto.has_floors ?? true;

    // ✅ VALIDATION LOGIC
    if (hasFloors && !createBuildingDto.total_floors) {
      throw new BadRequestException(
        'total_floors is required when has_floors = true',
      );
    }

    if (!hasFloors && createBuildingDto.total_floors) {
      throw new BadRequestException(
        'total_floors must be null when has_floors = false',
      );
    }

    const existingBuilding = await this.buildingRepository.findOne({
      where: {
        code: createBuildingDto.code,
        campus_id: campus_id,
      },
    });
    if (existingBuilding) {
      throw new ConflictException(
        'Building code already exists in this campus',
      );
    }

    const building = this.buildingRepository.create({
      ...createBuildingDto,
      campus_id,
      has_floors: hasFloors,
      total_floors: hasFloors ? createBuildingDto.total_floors : null,
      campus,
    });

    try {
      return await this.buildingRepository.save(building);
    } catch (error: any) {
      if (error?.code === '23505') {
        throw new ConflictException(
          'Building code already exists in this campus',
        );
      }
      throw error;
    }
  }
}
