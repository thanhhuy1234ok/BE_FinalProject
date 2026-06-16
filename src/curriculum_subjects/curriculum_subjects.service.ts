import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import {
    CreateCurriculumSubjectDto,
    CreateCurriculumSubjectsBulkDto,
    CreateCurriculumSubjectsBulkDtoV2,
    ImportCurriculumSubjectExcelDto,
    ImportCurriculumSubjectExcelNameDto,
} from './dto/create-curriculum_subject.dto';
import { UpdateCurriculumSubjectDto } from './dto/update-curriculum_subject.dto';
import { DataSource, In, Repository } from 'typeorm';
import { CurriculumSubject } from './entities/curriculum_subject.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Curriculum } from '@/curriculum/entities/curriculum.entity';
import { Subject } from '@/subjects/entities/subject.entity';
import { Major } from '@/majors/entities/major.entity';
import { YearOfAdmission } from '@/year-of-admission/entities/year-of-admission.entity';
import { buildAqpQueryOptions } from '@/helpers/func/buildAqpOptions';

@Injectable()
export class CurriculumSubjectsService {
    constructor(
        @InjectRepository(CurriculumSubject)
        private curriculumSubjectRepository: Repository<CurriculumSubject>,

        @InjectRepository(Curriculum)
        private curriculumRepository: Repository<Curriculum>,

        @InjectRepository(Subject)
        private subjectRepository: Repository<Subject>,

        @InjectRepository(Major)
        private majorRepository: Repository<Major>,

        @InjectRepository(YearOfAdmission)
        private yearOfAdmissionRepository: Repository<YearOfAdmission>,

        private readonly dataSource: DataSource,
    ) {}
    async create(dto: CreateCurriculumSubjectDto) {
        // 1) validate year/semester basic
        if (!Number.isInteger(dto.year) || dto.year < 1 || dto.year > 10) {
            throw new BadRequestException('year must be an integer >= 1');
        }
        if (
            !Number.isInteger(dto.semester) ||
            dto.semester < 1 ||
            dto.semester > 20
        ) {
            throw new BadRequestException('semester must be an integer >= 1');
        }

        // 2) check curriculum exists
        const curriculum = await this.curriculumRepository.findOne({
            where: { id: dto.curriculumId },
            select: { id: true },
        });
        if (!curriculum) {
            throw new NotFoundException(
                `Curriculum ${dto.curriculumId} not found`,
            );
        }

        // 3) check subject exists
        const subject = await this.subjectRepository.findOne({
            where: { id: dto.subjectId },
            select: { id: true },
        });
        if (!subject) {
            throw new NotFoundException(`Subject ${dto.subjectId} not found`);
        }

        // 4) prevent duplicate in same curriculum
        const existed = await this.curriculumSubjectRepository.findOne({
            where: {
                curriculumId: dto.curriculumId,
                subjectId: dto.subjectId,
            },
            select: { id: true },
        });
        if (existed) {
            throw new ConflictException(
                `Subject ${dto.subjectId} already exists in curriculum ${dto.curriculumId}`,
            );
        }

        // 5) create entity
        // const entity = this.curriculumSubjectRepository.create({
        //     curriculumId: dto.curriculumId,
        //     subjectId: dto.subjectId,
        //     semesterNumber: dto.semester,
        //     isRequired: dto.isRequired ?? true,
        //     creditsOverride: dto.creditsOverride,
        //     ordering: dto.ordering ?? 0,
        //     prerequisiteRule: dto.prerequisiteRule,
        //     isActive: dto.isActive ?? true,
        // });

        // // 6) save
        // try {
        //     const saved = await this.curriculumSubjectRepository.save(entity);

        //     // 7) return with relations (optional but useful for UI)
        //     return this.curriculumSubjectRepository.findOne({
        //         where: { id: saved.id },
        //         relations: { subject: true, curriculum: true },
        //     });
        // } catch (e: any) {
        //     // if you added UNIQUE at DB level, handle duplicate from DB too
        //     if (typeof e?.code === 'string' && e.code === '23505') {
        //         throw new ConflictException('Duplicate curriculum-subject');
        //     }
        //     throw e;
        // }
    }

    async importCurriculumSubjects(dto: ImportCurriculumSubjectExcelDto) {
        const inserted: CurriculumSubject[] = [];
        const skipped: any[] = [];

        for (const item of dto.items) {
            const existed = await this.curriculumSubjectRepository.findOne({
                where: {
                    curriculumId: item.curriculumId,
                    subjectId: item.subjectId,
                },
            });

            if (existed) {
                skipped.push({
                    curriculumId: item.curriculumId,
                    subjectId: item.subjectId,
                    reason: 'Môn học đã tồn tại trong chương trình đào tạo',
                });
                continue;
            }

            const entity = this.curriculumSubjectRepository.create({
                curriculumId: item.curriculumId,
                subjectId: item.subjectId,
                semesterNumber: item.semesterNumber,
                isRequired: item.isRequired ?? true,
                ordering: item.ordering ?? 0,
            });

            inserted.push(await this.curriculumSubjectRepository.save(entity));
        }

        return {
            insertedCount: inserted.length,
            skippedCount: skipped.length,
            inserted,
            skipped,
        };
    }

    // async importCurriculumSubjectsName(
    //     dto: ImportCurriculumSubjectExcelNameDto,
    // ) {
    //     const inserted: CurriculumSubject[] = [];
    //     const skipped: {
    //         curriculumName: string;
    //         subjectName: string;
    //         reason: string;
    //     }[] = [];

    //     for (const item of dto.items) {
    //         const curriculumName = item.curriculumName?.trim();
    //         const subjectName = item.subjectName?.trim();

    //         if (!curriculumName) {
    //             skipped.push({
    //                 curriculumName: '',
    //                 subjectName,
    //                 reason: 'Tên chương trình đào tạo bị trống',
    //             });
    //             continue;
    //         }

    //         if (!subjectName) {
    //             skipped.push({
    //                 curriculumName,
    //                 subjectName: '',
    //                 reason: 'Tên môn học bị trống',
    //             });
    //             continue;
    //         }

    //         const curriculum = await this.curriculumRepository.findOne({
    //             where: { name: curriculumName },
    //         });

    //         if (!curriculum) {
    //             skipped.push({
    //                 curriculumName,
    //                 subjectName,
    //                 reason: `Không tìm thấy chương trình đào tạo`,
    //             });
    //             continue;
    //         }

    //         const subject = await this.subjectRepository.findOne({
    //             where: { name: subjectName },
    //         });

    //         if (!subject) {
    //             skipped.push({
    //                 curriculumName,
    //                 subjectName,
    //                 reason: `Không tìm thấy môn học`,
    //             });
    //             continue;
    //         }

    //         const existed = await this.curriculumSubjectRepository.findOne({
    //             where: {
    //                 curriculumId: curriculum.id,
    //                 subjectId: subject.id,
    //             },
    //         });

    //         if (existed) {
    //             skipped.push({
    //                 curriculumName,
    //                 subjectName,
    //                 reason: 'Môn học đã tồn tại trong chương trình đào tạo',
    //             });
    //             continue;
    //         }

    //         try {
    //             const entity = this.curriculumSubjectRepository.create({
    //                 curriculumId: curriculum.id,
    //                 subjectId: subject.id,
    //                 semesterNumber: item.semesterNumber,
    //                 isRequired: item.isRequired ?? true,
    //                 ordering: item.ordering ?? 0,
    //                 prerequisiteRule: item.prerequisiteRule ?? null,
    //             });

    //             const saved =
    //                 await this.curriculumSubjectRepository.save(entity);
    //             inserted.push(saved);
    //         } catch (error) {
    //             skipped.push({
    //                 curriculumName,
    //                 subjectName,
    //                 reason: 'Lỗi khi tạo dữ liệu',
    //             });
    //         }
    //     }

    //     return {
    //         countSuccess: inserted.length,
    //         countError: skipped.length,
    //         inserted,
    //         skipped,
    //     };
    // }

    async importCurriculumSubjectsName(
        dto: ImportCurriculumSubjectExcelNameDto,
    ) {
        const skipped: {
            curriculumName: string;
            subjectName: string;
            reason: string;
        }[] = [];

        const items = dto.items || [];

        if (!items.length) {
            return {
                countSuccess: 0,
                countError: 0,
                inserted: [],
                skipped: [],
            };
        }

        const normalize = (value?: string) => value?.trim() || '';

        const curriculumNames = [
            ...new Set(
                items.map((i) => normalize(i.curriculumName)).filter(Boolean),
            ),
        ];

        const subjectNames = [
            ...new Set(
                items.map((i) => normalize(i.subjectName)).filter(Boolean),
            ),
        ];

        const [curriculums, subjects] = await Promise.all([
            this.curriculumRepository.find({
                where: { name: In(curriculumNames) },
            }),
            this.subjectRepository.find({
                where: { name: In(subjectNames) },
            }),
        ]);

        const curriculumMap = new Map(
            curriculums.map((c) => [c.name.trim(), c]),
        );
        const subjectMap = new Map(subjects.map((s) => [s.name.trim(), s]));

        const curriculumIds = curriculums.map((c) => c.id);
        const subjectIds = subjects.map((s) => s.id);

        const existedRelations =
            curriculumIds.length && subjectIds.length
                ? await this.curriculumSubjectRepository.find({
                      where: {
                          curriculumId: In(curriculumIds),
                          subjectId: In(subjectIds),
                      },
                      select: {
                          id: true,
                          curriculumId: true,
                          subjectId: true,
                      },
                  })
                : [];

        const existedSet = new Set(
            existedRelations.map((x) => `${x.curriculumId}-${x.subjectId}`),
        );

        const excelSet = new Set<string>();
        const entities: CurriculumSubject[] = [];

        for (const item of items) {
            const curriculumName = normalize(item.curriculumName);
            const subjectName = normalize(item.subjectName);

            if (!curriculumName) {
                skipped.push({
                    curriculumName: '',
                    subjectName,
                    reason: 'Tên chương trình đào tạo bị trống',
                });
                continue;
            }

            if (!subjectName) {
                skipped.push({
                    curriculumName,
                    subjectName: '',
                    reason: 'Tên môn học bị trống',
                });
                continue;
            }

            const curriculum = curriculumMap.get(curriculumName);
            const subject = subjectMap.get(subjectName);

            if (!curriculum) {
                skipped.push({
                    curriculumName,
                    subjectName,
                    reason: 'Không tìm thấy chương trình đào tạo',
                });
                continue;
            }

            if (!subject) {
                skipped.push({
                    curriculumName,
                    subjectName,
                    reason: 'Không tìm thấy môn học',
                });
                continue;
            }

            const semesterNumber = Number(item.semesterNumber);

            if (!semesterNumber || semesterNumber <= 0) {
                skipped.push({
                    curriculumName,
                    subjectName,
                    reason: 'Học kỳ không hợp lệ',
                });
                continue;
            }

            const key = `${curriculum.id}-${subject.id}`;

            if (excelSet.has(key)) {
                skipped.push({
                    curriculumName,
                    subjectName,
                    reason: 'Môn học bị trùng trong file Excel',
                });
                continue;
            }

            if (existedSet.has(key)) {
                skipped.push({
                    curriculumName,
                    subjectName,
                    reason: 'Môn học đã tồn tại trong chương trình đào tạo',
                });
                continue;
            }

            excelSet.add(key);
            existedSet.add(key);

            entities.push(
                this.curriculumSubjectRepository.create({
                    curriculumId: curriculum.id,
                    subjectId: subject.id,
                    semesterNumber,
                    isRequired: item.isRequired ?? true,
                    ordering: Number(item.ordering ?? 0),
                    prerequisiteRule: normalize(item.prerequisiteRule),
                }),
            );
        }

        let inserted: CurriculumSubject[] = [];

        if (entities.length) {
            inserted = await this.curriculumSubjectRepository.save(entities, {
                chunk: 500,
            });
        }

        return {
            countSuccess: inserted.length,
            countError: skipped.length,
            inserted,
            skipped,
        };
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
            textSearchFields: ['name', 'code'], // ❌ bỏ year_of_admission_id
            exactFields: ['isActive', 'curriculumId'],
            ignoreFilters: ['current', 'pageSize'],
            defaultSort: { createdAt: 'DESC' },
        });

        const [result, totalItems] =
            await this.curriculumSubjectRepository.findAndCount({
                where,
                skip: offset,
                take: pageLimit,
                order,
                relations: {
                    subject: true,
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
}
