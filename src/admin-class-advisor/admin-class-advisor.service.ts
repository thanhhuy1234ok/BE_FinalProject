import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { CreateAdminClassAdvisorDto } from './dto/create-admin-class-advisor.dto';
import { UpdateAdminClassAdvisorDto } from './dto/update-admin-class-advisor.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { AdminClass } from '@/admin-class/entities/admin-class.entity';
import { Teacher } from '@/users/entities/teacher.entity';
import { AdminClassAdvisor } from './entities/admin-class-advisor.entity';
import { DataSource } from 'typeorm';
import { AdminClassStatus } from '@/helpers/enum/enum.global';

@Injectable()
export class AdminClassAdvisorService {
    constructor(
        @InjectRepository(AdminClassAdvisor)
        private readonly adminClassAdvisorRepository: Repository<AdminClassAdvisor>,

        @InjectRepository(Teacher)
        private readonly teacherRepository: Repository<Teacher>,

        @InjectRepository(AdminClass)
        private readonly adminClassRepository: Repository<AdminClass>,

        private readonly dataSource: DataSource,
    ) {}
    async create(dto: CreateAdminClassAdvisorDto) {
        const startAt = dto.startAt ? new Date(dto.startAt) : new Date();

        if (Number.isNaN(startAt.getTime())) {
            throw new BadRequestException('Ngày bắt đầu không hợp lệ');
        }

        return this.dataSource.transaction(async (manager) => {
            // 1) Kiểm tra lớp hành chính
            const adminClass = await manager.findOne(AdminClass, {
                where: { id: dto.adminClassId },
            });

            if (!adminClass) {
                throw new NotFoundException('Không tìm thấy lớp hành chính');
            }

            if (adminClass.status === AdminClassStatus.GRADUATED) {
                throw new BadRequestException(
                    'Không thể phân công giáo viên chủ nhiệm cho lớp đã tốt nghiệp',
                );
            }

            // 2) Kiểm tra giáo viên
            const teacher = await manager.findOne(Teacher, {
                where: { id: dto.teacherId },
            });

            if (!teacher) {
                throw new NotFoundException('Không tìm thấy giáo viên');
            }

            // 3) Chặn giáo viên đang là GVCN active ở lớp khác
            const teacherActive = await manager.findOne(AdminClassAdvisor, {
                where: {
                    teacherId: dto.teacherId,
                    endAt: IsNull(),
                },
            });

            if (
                teacherActive &&
                teacherActive.adminClassId !== dto.adminClassId
            ) {
                throw new BadRequestException(
                    `Giáo viên này đang là cố vấn học tập của lớp ${teacherActive.adminClassId}`,
                );
            }

            // 4) Kiểm tra lớp hiện tại đã có GVCN active chưa
            const currentActive = await manager.findOne(AdminClassAdvisor, {
                where: {
                    adminClassId: dto.adminClassId,
                    endAt: IsNull(),
                },
            });

            if (currentActive) {
                // 4a) Nếu đang là cùng giáo viên thì chặn
                if (currentActive.teacherId === dto.teacherId) {
                    throw new BadRequestException(
                        'Lớp này đã có giáo viên chủ nhiệm này đang hoạt động',
                    );
                }

                // 4b) startAt mới phải sau startAt cũ
                if (startAt <= new Date(currentActive.startAt)) {
                    throw new BadRequestException(
                        'Ngày bắt đầu mới phải sau ngày bắt đầu của giáo viên chủ nhiệm hiện tại',
                    );
                }

                // 4c) Kết thúc GVCN cũ trước khi tạo GVCN mới
                currentActive.endAt = new Date(startAt.getTime() - 1);
                await manager.save(AdminClassAdvisor, currentActive);
            }

            // 5) Chặn trùng lịch sử
            const duplicated = await manager.findOne(AdminClassAdvisor, {
                where: {
                    adminClassId: dto.adminClassId,
                    teacherId: dto.teacherId,
                    startAt,
                },
            });

            if (duplicated) {
                throw new BadRequestException(
                    'Bản ghi giáo viên chủ nhiệm đã tồn tại',
                );
            }

            // 6) Tạo bản ghi mới
            const record = manager.create(AdminClassAdvisor, {
                adminClassId: dto.adminClassId,
                teacherId: dto.teacherId,
                startAt,
                endAt: null,
                isPrimary: true,
            });

            return await manager.save(AdminClassAdvisor, record);
        });
    }

    findAll() {
        return `This action returns all adminClassAdvisor`;
    }

    async findOne(adminClassId: number) {
        const advisor = await this.adminClassAdvisorRepository.findOne({
            where: {
                adminClass: { id: adminClassId },
            },
            relations: {
                teacher: {
                    user: true,
                    department: true,
                },
                adminClass: true,
            },
            order: {
                id: 'DESC',
            },
        });

        return advisor;
    }

    update(id: number, updateAdminClassAdvisorDto: UpdateAdminClassAdvisorDto) {
        return `This action updates a #${id} adminClassAdvisor`;
    }

    remove(id: number) {
        return `This action removes a #${id} adminClassAdvisor`;
    }
}
