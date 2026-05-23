import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Room } from './entities/room.entity';
import { Repository } from 'typeorm';
import { Building } from '@/building/entities/building.entity';
import { buildAqpQueryOptions } from '@/helpers/func/buildAqpOptions';

@Injectable()
export class RoomsService {
    constructor(
        @InjectRepository(Room)
        private roomsRepository: Repository<Room>,

        @InjectRepository(Building)
        private buildingsRepository: Repository<Building>,
    ) {}
    async create(dto: CreateRoomDto) {
        const { name, building_id, capacity, floor, type } = dto;

        // 1) Check building tồn tại
        const building = await this.buildingsRepository.findOne({
            where: { id: building_id, is_active: true },
        });

        if (!building) {
            throw new NotFoundException(
                `Building with ID ${building_id} not found or inactive.`,
            );
        }

        // 2) Validate floor theo building.has_floors
        let finalFloor: number | null = floor ?? null;

        if (!building.has_floors) {
            finalFloor = null; // building không có tầng => room không có floor
        } else {
            // building có tầng nhưng user không truyền floor
            if (finalFloor === null) {
                throw new ConflictException(
                    `Floor is required for this building.`,
                );
            }

            // nếu total_floors có set thì phải nằm trong range
            if (
                building.total_floors &&
                (finalFloor < 1 || finalFloor > building.total_floors)
            ) {
                throw new ConflictException(
                    `Floor must be between 1 and ${building.total_floors}.`,
                );
            }
        }
        const code = (await this.previewRoomCode(building_id, finalFloor))
            .preview_code;

        // 3) Check trùng trong cùng building (ưu tiên check theo code; name có thể trùng)
        // Nếu bạn muốn: code bắt buộc, name optional
        const existing = await this.roomsRepository.findOne({
            where: {
                building_id,
                code: code.trim(),
            },
        });

        if (existing) {
            throw new ConflictException(
                `Room code "${code}" already exists in this building.`,
            );
        }

        // 4) Create
        const room = this.roomsRepository.create({
            building_id,
            building,
            code: code.trim(),
            name: name?.trim(),
            capacity: capacity ?? null,
            floor: finalFloor,
            type: type?.trim(),
            isActive: true,
        });

        return await this.roomsRepository.save(room);
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
            ignoreFilters: ['current', 'pageSize'],
            defaultSort: { createdAt: 'DESC' },
        });

        const totalItems = await this.roomsRepository.count({
            where,
        });

        const totalPages = Math.ceil(totalItems / pageLimit);

        const result = await this.roomsRepository.find({
            where,
            skip: offset,
            take: pageLimit,
            order,
            relations: {
                building: true,
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

    findOne(id: number) {
        return `This action returns a #${id} room`;
    }

    update(id: number, updateRoomDto: UpdateRoomDto) {
        return `This action updates a #${id} room`;
    }

    async previewRoomCode(buildingId: number, floor?: number | null) {
        const building = await this.buildingsRepository.findOne({
            where: { id: buildingId, is_active: true },
        });

        if (!building) {
            throw new NotFoundException(`Building ${buildingId} not found.`);
        }

        const hasFloors = building.has_floors;
        const finalFloor = hasFloors ? (floor ?? null) : null;

        if (hasFloors && finalFloor === null) {
            throw new ConflictException(`Floor is required for this building.`);
        }

        if (
            hasFloors &&
            building.total_floors &&
            (finalFloor! < 1 || finalFloor! > building.total_floors)
        ) {
            throw new ConflictException(
                `Floor must be between 1 and ${building.total_floors}.`,
            );
        }

        // Đếm số phòng hiện có (không lock → chỉ preview)
        const count = await this.roomsRepository.count({
            where: {
                building_id: buildingId,
                ...(finalFloor !== null ? { floor: finalFloor } : {}),
            },
        });

        const next = count + 1;
        const buildingCode = building.code.trim().toUpperCase();

        const pad = (num: number, size: number) =>
            String(num).padStart(size, '0');

        // Generate giống create()
        if (hasFloors) {
            return {
                preview_code: `${buildingCode}-${finalFloor}${pad(next, 2)}`, // A-101
            };
        }

        return {
            preview_code: `${buildingCode}-${pad(next, 3)}`, // LIB-001
        };
    }
}
