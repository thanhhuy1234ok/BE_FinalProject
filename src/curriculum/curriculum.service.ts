import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateCurriculumDto } from './dto/create-curriculum.dto';
import { UpdateCurriculumDto } from './dto/update-curriculum.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Curriculum, CurriculumStatus } from './entities/curriculum.entity';
import { In, Repository } from 'typeorm';
import { YearOfAdmission } from '@/year-of-admission/entities/year-of-admission.entity';
import { Major } from '@/majors/entities/major.entity';
import { buildAqpQueryOptions } from '@/helpers/func/buildAqpOptions';

@Injectable()
export class CurriculumService {
    constructor(
        @InjectRepository(Curriculum)
        private curriculumRepository: Repository<Curriculum>,

        @InjectRepository(Major)
        private majorRepository: Repository<Major>,

        @InjectRepository(YearOfAdmission)
        private yearOfAdmissionRepository: Repository<YearOfAdmission>,
    ) {}
    async create(createCurriculumDto: CreateCurriculumDto) {
        const { majorId, yearOfAdmissionId, effective_from, effective_to } =
            createCurriculumDto;

        const major = await this.majorRepository.findOneBy({ id: majorId });
        const yearOfAdmission = await this.yearOfAdmissionRepository.findOneBy({
            id: yearOfAdmissionId,
        });

        if (!major || !yearOfAdmission) {
            throw new BadRequestException(
                'Major hoặc Year of Admission không tồn tại',
            );
        }

        if (effective_from && effective_to && effective_from > effective_to) {
            throw new BadRequestException(
                'effective_from phải nhỏ hơn effective_to',
            );
        }

        const qb = this.curriculumRepository
            .createQueryBuilder('c')
            .where('c.major_id = :majorId', { majorId })
            .andWhere('c.year_of_admission_id = :yearOfAdmissionId', {
                yearOfAdmissionId,
            })
            .andWhere('c.deletedAt IS NULL');

        if (effective_from) {
            qb.andWhere(
                '(c.effective_to IS NULL OR c.effective_to >= :effective_from)',
                {
                    effective_from,
                },
            );
        }

        if (effective_to) {
            qb.andWhere(
                '(c.effective_from IS NULL OR c.effective_from <= :effective_to)',
                {
                    effective_to,
                },
            );
        }

        const overlapping = await qb.getOne();

        if (overlapping) {
            throw new BadRequestException(
                'Chương trình đào tạo đã tồn tại trong khoảng thời gian này',
            );
        }

        const { name: autoName, code: autoCode } =
            await this.generateCurriculumNameCode(majorId, yearOfAdmissionId);

        const curriculum = this.curriculumRepository.create({
            name: autoName,
            code: autoCode,
            major,
            yearOfAdmission,
            major_id: majorId,
            year_of_admission_id: yearOfAdmissionId,
            effective_from: effective_from ?? null,
            effective_to: effective_to ?? null,
            total_credits_required:
                createCurriculumDto.total_credits_required ?? null,
            status: createCurriculumDto.status ?? CurriculumStatus.DRAFT,
        });

        return await this.curriculumRepository.save(curriculum);
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
            exactFields: [
                'is_active',
                'major_id',
                'year_of_admission_id',
                'status',
            ],
            relationExact: {
                department_id: {
                    relation: 'major',
                    field: 'department_id',
                },
            },
            ignoreFilters: ['current', 'pageSize'],
            defaultSort: { createdAt: 'DESC' },
        });

        const [result, totalItems] =
            await this.curriculumRepository.findAndCount({
                where,
                skip: offset,
                take: pageLimit,
                order,
                relations: {
                    yearOfAdmission: true,
                    major: {
                        department: true,
                    },
                },
            });

        const totalPages = Math.ceil(totalItems / pageLimit);

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

    async generateCurriculumNameCode(
        majorName: number,
        yearOfAdmission: number,
    ) {
        const major = await this.majorRepository.findOneBy({ id: majorName });
        const year = await this.yearOfAdmissionRepository.findOneBy({
            id: yearOfAdmission,
        });
        if (!major || !year) {
            throw new BadRequestException(
                'Major or Year of Admission not found',
            );
        }

        return {
            name: `Chương trình đào tạo ${major.name} ${year.code}`,
            code: `CURR-${major.code}-${year.code}`,
        };
    }

    findOne(id: number) {
        return `This action returns a #${id} curriculum`;
    }

    update(id: number, updateCurriculumDto: UpdateCurriculumDto) {
        return `This action updates a #${id} curriculum`;
    }

    remove(id: number) {
        return `This action removes a #${id} curriculum`;
    }
}
