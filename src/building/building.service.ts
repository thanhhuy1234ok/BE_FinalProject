import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { CreateBuildingDto } from './dto/create-building.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Building } from './entities/building.entity';
import { ILike, Repository } from 'typeorm';
import { Campus } from '@/campus/entities/campus.entity';
import { buildAqpQueryOptions } from '@/helpers/func/buildAqpOptions';

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
        const totalFloors = createBuildingDto.total_floors;
        const code = createBuildingDto.code?.trim();
        const name = createBuildingDto.name?.trim();

        if (!code) {
            throw new BadRequestException('Building code is required');
        }

        if (!name) {
            throw new BadRequestException('Building name is required');
        }

        if (hasFloors) {
            if (totalFloors === null || totalFloors === undefined) {
                throw new BadRequestException(
                    'total_floors is required when has_floors = true',
                );
            }

            if (totalFloors <= 0) {
                throw new BadRequestException(
                    'total_floors must be greater than 0 when has_floors = true',
                );
            }
        } else {
            if (
                totalFloors !== null &&
                totalFloors !== undefined &&
                totalFloors !== 0
            ) {
                throw new BadRequestException(
                    'total_floors must be null when has_floors = false',
                );
            }
        }

        const existingCode = await this.buildingRepository.findOne({
            where: {
                campus_id,
                code: ILike(code),
            },
        });

        if (existingCode) {
            throw new ConflictException(
                'Building code already exists in this campus',
            );
        }

        const existingName = await this.buildingRepository.findOne({
            where: {
                campus_id,
                name: ILike(name),
            },
        });

        if (existingName) {
            throw new ConflictException(
                'Building name already exists in this campus',
            );
        }

        const building = this.buildingRepository.create({
            ...createBuildingDto,
            campus_id,
            campus,
            code,
            name,
            has_floors: hasFloors,
            total_floors: hasFloors ? totalFloors : null,
        });

        try {
            return await this.buildingRepository.save(building);
        } catch (error: any) {
            if (error?.code === '23505') {
                throw new ConflictException(
                    'Building code or name already exists in this campus',
                );
            }
            throw error;
        }
    }

    async findAll(currentPage: number, limit: number, qs: string) {
        const {
            where,
            order,
            offset,
            limit: pageLimit,
        } = buildAqpQueryOptions(qs, {
            currentPage,
            limit,
            defaultLimit: 10,
            textSearchFields: ['name', 'code'],
            exactFields: ['campus_id', 'is_active'],
            relationILike: {
                campus: { relation: 'campus', field: 'name' },
            },
            ignoreFilters: ['current', 'pageSize'],
            defaultSort: { createdAt: 'DESC' },
        });

        const totalItems = await this.buildingRepository.count({
            where,
        });

        const totalPages = Math.ceil(totalItems / pageLimit);

        const result = await this.buildingRepository.find({
            where,
            skip: offset,
            take: pageLimit,
            order,
            relations: {
                campus: true,
            },
        });

        return {
            meta: {
                current: currentPage,
                pageSize: pageLimit,
                pages: totalPages,
                total: totalItems,
            },
            result,
        };
    }
}
