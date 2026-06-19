import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { CreateTermDto } from './dto/create-term.dto';
import { UpdateTermDto } from './dto/update-term.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Term } from './entities/term.entity';
import { Repository } from 'typeorm';
import { buildAqpQueryOptions } from '@/helpers/func/buildAqpOptions';
import { SemesterEnum } from '@/helpers/enum/enum.global';

@Injectable()
export class TermsService {
    constructor(
        @InjectRepository(Term)
        private termsRepository: Repository<Term>,
    ) {}

    async create(createTermDto: CreateTermDto) {
        const { year, semester, isActive } = createTermDto;

        const start = new Date(createTermDto.startDate);
        const end = new Date(createTermDto.endDate);

        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            throw new BadRequestException(
                'Ngày bắt đầu hoặc ngày kết thúc không hợp lệ',
            );
        }

        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        if (start >= end) {
            throw new BadRequestException(
                'Ngày bắt đầu phải trước ngày kết thúc',
            );
        }

        // ✅ Năm của ngày phải khớp với năm học
        // if (start.getFullYear() !== year || end.getFullYear() !== year) {
        //     throw new BadRequestException(
        //         `Kỳ ${semester} của năm ${year} phải có ngày bắt đầu và ngày kết thúc thuộc năm ${year}`,
        //     );
        // }

        // const existed = await this.termsRepository.findOne({
        //     where: { year, semester },
        // });

        // if (existed) {
        //     throw new ConflictException(
        //         `Kỳ ${semester} của năm ${year} đã tồn tại`,
        //     );
        // }

        const prerequisiteMap = {
            [SemesterEnum.HK1]: SemesterEnum.HK1,
            [SemesterEnum.HK2]: SemesterEnum.HK1,
            [SemesterEnum.SUMMER]: SemesterEnum.SUMMER,
        };

        const prerequisiteSemester = prerequisiteMap[semester];
        let prerequisiteTerm: Term | null = null;

        if (prerequisiteSemester) {
            prerequisiteTerm = await this.termsRepository.findOne({
                where: {
                    year,
                    semester: prerequisiteSemester,
                },
            });

            if (!prerequisiteTerm) {
                throw new BadRequestException(
                    `Không thể tạo ${semester} khi chưa tồn tại ${prerequisiteSemester} của năm ${year}`,
                );
            }

            const prerequisiteEnd = new Date(prerequisiteTerm.endDate);
            prerequisiteEnd.setHours(0, 0, 0, 0);

            if (start <= prerequisiteEnd) {
                throw new BadRequestException(
                    `${semester} phải có ngày bắt đầu sau ngày kết thúc của ${prerequisiteSemester} (${prerequisiteEnd.toLocaleDateString('vi-VN')})`,
                );
            }
        }

        const termsInYear = await this.termsRepository.find({
            where: { year },
        });

        for (const item of termsInYear) {
            const itemStart = new Date(item.startDate);
            const itemEnd = new Date(item.endDate);

            itemStart.setHours(0, 0, 0, 0);
            itemEnd.setHours(0, 0, 0, 0);

            const isOverlapping = start <= itemEnd && end >= itemStart;

            if (isOverlapping) {
                throw new BadRequestException(
                    `Khoảng thời gian bị trùng với ${item.semester} năm ${item.year} (${itemStart.toLocaleDateString('vi-VN')} - ${itemEnd.toLocaleDateString('vi-VN')})`,
                );
            }
        }

        if (isActive) {
            const currentActiveTerm = await this.termsRepository.findOne({
                where: { isActive: true },
            });

            if (currentActiveTerm) {
                throw new BadRequestException(
                    `Hiện đã có kỳ ${currentActiveTerm.semester} năm ${currentActiveTerm.year} đang hoạt động. Vui lòng tạo kỳ mới ở trạng thái chưa hoạt động.`,
                );
            }
        }

        const term = this.termsRepository.create({
            year,
            semester,
            startDate: start,
            endDate: end,
            isActive: isActive ?? false,
        });

        return await this.termsRepository.save(term);
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
            textSearchFields: [],
            exactFields: ['year', 'semester', 'isActive'],
            ignoreFilters: ['current', 'pageSize'],
            defaultSort: { id: 'ASC' },
        });

        const totalItems = await this.termsRepository.count({ where });

        const totalPages = Math.ceil(totalItems / pageLimit);

        const result = await this.termsRepository.find({
            where,
            skip: offset,
            take: pageLimit,
            order,
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

    async findOne(id: number) {
        const term = await this.termsRepository.findOne({
            where: { id },
        });

        if (!term) {
            throw new NotFoundException(`Term with id ${id} not found`);
        }

        return term;
    }

    async update(id: number, updateTermDto: UpdateTermDto) {
        const term = await this.termsRepository.findOne({
            where: { id },
        });

        if (!term) {
            throw new NotFoundException(`Term with id ${id} not found`);
        }

        const updated = this.termsRepository.merge(term, updateTermDto);
        return await this.termsRepository.save(updated);
    }

    async remove(id: number) {
        const term = await this.termsRepository.findOne({
            where: { id },
        });

        if (!term) {
            throw new NotFoundException(`Term with id ${id} not found`);
        }

        await this.termsRepository.softDelete(id);
        return { message: `Term ${id} deleted successfully` };
    }

    private normalizeDate(date: Date | string) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d;
    }

    async activate(id: number) {
        const term = await this.termsRepository.findOne({
            where: { id },
        });

        if (!term) {
            throw new NotFoundException('Không tìm thấy kỳ học');
        }

        const currentActiveTerm = await this.termsRepository.findOne({
            where: { isActive: true },
        });

        if (currentActiveTerm?.id === term.id) {
            throw new BadRequestException('Kỳ học này đang hoạt động');
        }

        const today = this.normalizeDate(new Date());

        const allTerms = await this.termsRepository.find();

        const actualCurrentTerm = allTerms.find((item) => {
            const startDate = this.normalizeDate(item.startDate);
            const endDate = this.normalizeDate(item.endDate);

            return today >= startDate && today <= endDate;
        });

        if (currentActiveTerm) {
            const currentEndDate = this.normalizeDate(
                currentActiveTerm.endDate,
            );
            const targetStartDate = this.normalizeDate(term.startDate);

            const isActiveTermCorrect =
                !!actualCurrentTerm &&
                actualCurrentTerm.id === currentActiveTerm.id;

            if (isActiveTermCorrect) {
                if (today < currentEndDate) {
                    throw new BadRequestException(
                        `Không thể chuyển kỳ vì kỳ ${currentActiveTerm.semester} năm ${currentActiveTerm.year} chưa kết thúc. Ngày kết thúc là ${currentEndDate.toLocaleDateString('vi-VN')}`,
                    );
                }

                if (targetStartDate < currentEndDate) {
                    throw new BadRequestException(
                        'Không thể chuyển sang kỳ học có ngày bắt đầu trước ngày kết thúc của kỳ hiện tại',
                    );
                }
            }
        }

        await this.termsRepository
            .createQueryBuilder()
            .update(Term)
            .set({ isActive: false })
            .execute();

        term.isActive = true;

        return await this.termsRepository.save(term);
    }
}
