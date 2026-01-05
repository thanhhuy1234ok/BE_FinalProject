import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateAdminClassDto } from './dto/create-admin-class.dto';
import { UpdateAdminClassDto } from './dto/update-admin-class.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { AdminClass } from './entities/admin-class.entity';
import { Repository } from 'typeorm';
import { Major } from '@/majors/entities/major.entity';
import { YearOfAdmission } from '@/year-of-admission/entities/year-of-admission.entity';
import { Teacher } from '@/users/entities/teacher.entity';

@Injectable()
export class AdminClassService {
  constructor(
    @InjectRepository(AdminClass)
    private readonly adminClassRepository: Repository<AdminClass>,

    @InjectRepository(Major)
    private readonly majorRepo: Repository<Major>,

    @InjectRepository(YearOfAdmission)
    private readonly yearOfAdmissionRepo: Repository<YearOfAdmission>,

    @InjectRepository(Teacher)
    private readonly teacherRepo: Repository<Teacher>,
  ) {}
  async create(createAdminClassDto: CreateAdminClassDto) {
    const {
      code,
      name,
      capacity,
      major_id,
      yearOfAdmissionId,
      homeroomTeacherId,
    } = createAdminClassDto;

    // 1. Check major tồn tại
    const major = await this.majorRepo.findOne({ where: { id: major_id } });
    if (!major) throw new NotFoundException('Major not found');

    // 2. Check yearOfAdmission tồn tại
    const year = await this.yearOfAdmissionRepo.findOne({
      where: { id: yearOfAdmissionId },
    });
    if (!year) throw new NotFoundException('YearOfAdmission not found');

    let finalCode = code;

    if (!finalCode || finalCode.trim() === '') {
      finalCode = await this.generateAdminClassCode(major, year);
    } else {
      // Nếu gửi code → check unique
      const existed = await this.adminClassRepository.findOne({
        where: { code },
      });
      if (existed) {
        throw new BadRequestException('Admin class code already exists');
      }
    }

    // 4. (Optional) nếu có homeroomTeacher
    let teacher = null;
    if (homeroomTeacherId) {
      teacher = await this.teacherRepo.findOne({
        where: { id: homeroomTeacherId },
      });
      if (!teacher) throw new NotFoundException('Homeroom teacher not found');
    }

    // 5. Create entity
    const adminClass = this.adminClassRepository.create({
      code: finalCode,
      name,
      capacity,
      major_id,
      yearOfAdmissionId,
      homeroomTeacherId: homeroomTeacherId ?? null,
      isActive: true,
    });

    const saved = await this.adminClassRepository.save(adminClass);

    return this.adminClassRepository.findOne({
      where: { id: saved.id },
      relations: ['major', 'yearOfAdmission'],
    });
  }
  findAll() {
    return `This action returns all adminClass`;
  }

  findOne(id: number) {
    return `This action returns a #${id} adminClass`;
  }

  update(id: number, updateAdminClassDto: UpdateAdminClassDto) {
    const data = updateAdminClassDto;
    return {
      data,
      masage: `This action updates a #${id} adminClass`,
    };
  }

  remove(id: number) {
    return `This action removes a #${id} adminClass`;
  }

  private async generateAdminClassCode(major: Major, year: YearOfAdmission) {
    // K + 2 số cuối
    const cohort = `K${year.year.toString().slice(-2)}`; // 2023 -> K23

    // Lấy toàn bộ lớp đã có theo major + year
    const existingClasses = await this.adminClassRepository.find({
      where: {
        major_id: major.id,
        yearOfAdmissionId: year.id,
      },
    });

    // Tìm số thứ tự lớp tiếp theo
    const nextIndex = existingClasses.length + 1;
    const indexString = nextIndex.toString().padStart(2, '0'); // 1 → 01

    // Ghép code chuẩn: MAJOR_K23_01
    return `${major.code}_${cohort}_${indexString}`;
  }
}
