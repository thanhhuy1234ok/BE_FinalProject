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
import { normalizeMajorCode, toKCode } from '@/helpers/func/previewCode';

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
  ) { }
  async create(dto: CreateAdminClassDto) {
    const { name, capacity, major_id, yearOfAdmissionId, homeroomTeacherId } =
      dto;

    // 1) Generate code + suggestedName (đã check major/year tồn tại ở trong hàm)
    const { code, suggestedName } = await this.buildAdminClassCode(
      major_id,
      yearOfAdmissionId,
    );

    // 2) name: nếu FE không nhập => dùng suggestedName
    const finalName = name?.trim() ? name.trim() : suggestedName;

    // 3) Optional check teacher (nếu bạn vẫn giữ homeroomTeacherId)
    if (homeroomTeacherId) {
      const teacher = await this.teacherRepo.findOne({
        where: { id: homeroomTeacherId },
      });
      if (!teacher) throw new NotFoundException('Homeroom teacher not found');
    }

    const adminClass = this.adminClassRepository.create({
      code,
      name: finalName,
      capacity: capacity ?? 50,
      major_id,
      yearOfAdmissionId,
      isActive: true,
    });

    // 4) Save + handle race condition unique(code)
    try {
      return await this.adminClassRepository.save(adminClass);
    } catch (e: any) {
      // Postgres unique violation
      if (e?.code === '23505') {
        throw new BadRequestException(
          'Generated class code already exists. Please try again.',
        );
      }
      throw e;
    }
  }

  async previewCode(majorId: number, yearOfAdmissionId: number) {
    return this.buildAdminClassCode(majorId, yearOfAdmissionId);
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

  async buildAdminClassCode(majorId: number, yearOfAdmissionId: number) {
    const major = await this.majorRepo.findOne({ where: { id: majorId } });
    if (!major) throw new NotFoundException('Major not found');

    const year = await this.yearOfAdmissionRepo.findOne({
      where: { id: yearOfAdmissionId },
    });
    if (!year) throw new NotFoundException('YearOfAdmission not found');

    // Major: bạn nên có major.code (vd: CNTT) + major.name (vd: Công nghệ thông tin)
    const majorCode = normalizeMajorCode((major as any).code ?? major.name);
    const majorName = (major as any).name ?? majorCode;

    // YearOfAdmission: bạn có year.year (vd: 2023). Nếu có field khác thì giữ fallback.
    const yearCodeRaw =
      (year as any).code ?? (year as any).year ?? (year as any).name;

    const k = toKCode(yearCodeRaw); // "23"
    const kText = `K${k}`; // "K23"

    // đếm số lớp đã có trong cùng major + year
    const existingCount = await this.adminClassRepository.count({
      where: { major_id: majorId, yearOfAdmissionId },
    });

    const order = existingCount + 1; // 1,2,3...
    const order2 = String(order).padStart(2, '0'); // 01,02...

    const code = `${majorCode}_${kText}_${order2}`; // CNTT_K23_01
    const suggestedName = `${majorName} ${kText} lớp ${order}`; // Công nghệ thông tin K23 lớp 1

    return { code, suggestedName, order };
  }

}
