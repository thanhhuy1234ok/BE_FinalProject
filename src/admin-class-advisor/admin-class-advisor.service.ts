import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateAdminClassAdvisorDto } from './dto/create-admin-class-advisor.dto';
import { UpdateAdminClassAdvisorDto } from './dto/update-admin-class-advisor.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { AdminClass } from '@/admin-class/entities/admin-class.entity';
import { Teacher } from '@/users/entities/teacher.entity';
import { AdminClassAdvisor } from './entities/admin-class-advisor.entity';
import { DataSource } from "typeorm";


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
  ) { }
  async create(dto: CreateAdminClassAdvisorDto) {
    const startAt = dto.startAt ? new Date(dto.startAt) : new Date();
    if (Number.isNaN(startAt.getTime())) {
      throw new BadRequestException('startAt is invalid');
    }

    return this.dataSource.transaction(async (manager) => {
      // 1) Check class
      const adminClass = await manager.findOne(AdminClass, {
        where: { id: dto.adminClassId },
      });

      if (!adminClass) throw new NotFoundException('AdminClass not found');
      if (!adminClass.isActive) throw new BadRequestException('Class is not active');

      // ✅ chặn teacher đang advisor active ở lớp khác
      const teacherActive = await manager.findOne(AdminClassAdvisor, {
        where: {
          teacherId: dto.teacherId,

        },
      });

      if (teacherActive && teacherActive.adminClassId !== dto.adminClassId) {
        throw new BadRequestException(
          `Teacher is already active advisor of class ${teacherActive.adminClassId}`,
        );
      }
      // 2) Check teacher
      const teacher = await manager.findOne(Teacher, {
        where: { id: dto.teacherId },
      });
      if (!teacher) throw new NotFoundException('Teacher not found');

      // 3) Check lớp đã có advisor active chưa (rule: mỗi lớp chỉ 1 advisor)
      const currentActive = await manager.findOne(AdminClassAdvisor, {
        where: { adminClassId: dto.adminClassId, endAt: IsNull() },
      });

      // Nếu đã có advisor active
      if (currentActive) {
        // 3a) Nếu đang là cùng teacher => không cần tạo mới
        if (currentActive.teacherId === dto.teacherId) {
          throw new BadRequestException('This class already has this advisor active');
        }

        // 3b) Validate startAt hợp lệ (tránh endAt < startAt cũ)
        if (startAt <= currentActive.startAt) {
          throw new BadRequestException(
            'startAt must be after current advisor startAt',
          );
        }

        // 3c) End advisor cũ trước khi tạo advisor mới
        currentActive.endAt = new Date(startAt.getTime() - 1);
        await manager.save(AdminClassAdvisor, currentActive);
      }

      // 4) Optional: chặn duplicate history record (cùng teacher, cùng startAt)
      const duplicated = await manager.findOne(AdminClassAdvisor, {
        where: {
          adminClassId: dto.adminClassId,
          teacherId: dto.teacherId,
          startAt,
        },
      });
      if (duplicated) {
        throw new BadRequestException('Duplicate advisor record');
      }

      // 5) Create new advisor record (active)
      const record = manager.create(AdminClassAdvisor, {
        adminClassId: dto.adminClassId,
        teacherId: dto.teacherId,
        startAt,
        endAt: null,
        isPrimary: true, // optional, vì bạn chỉ có 1 advisor thì luôn true
      });

      return manager.save(AdminClassAdvisor, record);
    });
  }

  findAll() {
    return `This action returns all adminClassAdvisor`;
  }

  findOne(id: number) {
    return `This action returns a #${id} adminClassAdvisor`;
  }

  update(id: number, updateAdminClassAdvisorDto: UpdateAdminClassAdvisorDto) {
    return `This action updates a #${id} adminClassAdvisor`;
  }

  remove(id: number) {
    return `This action removes a #${id} adminClassAdvisor`;
  }
}
