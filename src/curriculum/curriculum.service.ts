import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateCurriculumDto } from './dto/create-curriculum.dto';
import { UpdateCurriculumDto } from './dto/update-curriculum.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Curriculum } from './entities/curriculum.entity';
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
                'Major or Year of Admission not found',
            );
        }

        if (effective_from && effective_to && effective_from > effective_to) {
            throw new BadRequestException(
                'effective_from must be before effective_to',
            );
        }

        const overlapping = await this.curriculumRepository
            .createQueryBuilder('c')
            .where('c.major_id = :majorId', { majorId }) // ✅ sửa major_Id -> major_id
            .andWhere('c.year_of_admission_id = :yearOfAdmissionId', {
                yearOfAdmissionId,
            })
            .andWhere('c.deletedAt IS NULL')
            .andWhere(
                `
        (:effective_from <= c.effective_to OR c.effective_to IS NULL)
        AND
        (:effective_to >= c.effective_from OR c.effective_from IS NULL)
      `,
                { effective_from, effective_to },
            )
            .getOne();

        if (overlapping) {
            throw new BadRequestException(
                'Curriculum time range overlaps with an existing curriculum',
            );
        }

        // ✅ auto name + code theo major + khóa
        const { name: autoName, code: autoCode } =
            await this.generateCurriculumNameCode(majorId, yearOfAdmissionId);

        const curriculum = this.curriculumRepository.create({
            ...createCurriculumDto,

            // ✅ override/auto generate
            name: autoName,
            code: autoCode,

            major,
            yearOfAdmission,
            major_id: majorId,
            year_of_admission_id: yearOfAdmissionId,
        });

        return this.curriculumRepository.save(curriculum);
    }

    // async findAll(currentPage: number, limit: number, qs: string) {
    //     const {
    //         where,
    //         order,
    //         offset,
    //         limit: pageLimit,
    //     } = buildAqpQueryOptions(qs, {
    //         currentPage,
    //         limit,
    //         defaultLimit: 10,
    //         textSearchFields: ['name', 'code'],
    //         exactFields: ['isActive', 'major_id', 'year_of_admission_id'], // dùng exact cho id
    //         ignoreFilters: ['current', 'pageSize'],
    //         defaultSort: { createdAt: 'DESC' },
    //     });

    //     const [result, totalItems] =
    //         await this.curriculumRepository.findAndCount({
    //             where,
    //             skip: offset,
    //             take: pageLimit,
    //             order,
    //             relations: {
    //                 yearOfAdmission: true, // nếu cần trả về relation
    //                 major: true,
    //             },
    //         });

    //     const totalPages = Math.ceil(totalItems / pageLimit);

    //     return {
    //         meta: {
    //             current: currentPage,
    //             pageSize: pageLimit,
    //             pages: totalPages,
    //             total: totalItems,
    //         },
    //         result,
    //     };
    // }

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
