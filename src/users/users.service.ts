import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { CreateUserDto, ImportStudentExcelDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { DataSource, EntityManager, ILike, In, Not, Repository } from 'typeorm';
import { Role } from '@/roles/entities/role.entity';
import {
    ADMIN_ROLE,
    EMAIL_ADMIN,
    STUDENT_ROLE,
    TEACHER_ROLE,
} from '@/helpers/types/constans';
import { getHashPassword } from '@/helpers/func/password.util';
import { isValidPhone } from '@/helpers/func/checkPhone';
import { buildAqpQueryOptions } from '@/helpers/func/buildAqpOptions';
import { Student } from './entities/student.entity';
import { YearOfAdmission } from '@/year-of-admission/entities/year-of-admission.entity';
import { Major } from '@/majors/entities/major.entity';
import { Teacher } from './entities/teacher.entity';
import { AdminClass } from '@/admin-class/entities/admin-class.entity';
import { Department } from '@/departments/entities/department.entity';
import {
    AdminClassStatus,
    RegistrationStatus,
} from '@/helpers/enum/enum.global';
import { CourseOffering } from '@/course-offering/entities/course-offering.entity';
import { Grade } from '@/grades/entities/grade.entity';
import { Attendance } from '@/attendance/entities/attendance.entity';
import { CourseRegistration } from '@/course-registration/entities/course-registration.entity';
import dayjs from 'dayjs';
import { Curriculum } from '@/curriculum/entities/curriculum.entity';
import { CurriculumSubject } from '@/curriculum_subjects/entities/curriculum_subject.entity';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private readonly usersRepository: Repository<User>,

        @InjectRepository(Role)
        private readonly rolesRepository: Repository<Role>,

        @InjectRepository(Student)
        private readonly studentRepo: Repository<Student>,

        @InjectRepository(YearOfAdmission)
        private readonly yearOfAdmissionRepo: Repository<YearOfAdmission>,

        @InjectRepository(Major)
        private readonly majorRepo: Repository<Major>,

        @InjectRepository(Teacher)
        private readonly teacherRepo: Repository<Teacher>,

        @InjectRepository(CourseOffering)
        private readonly courseOfferingRepo: Repository<CourseOffering>,

        @InjectRepository(Attendance)
        private readonly attendanceRepo: Repository<Attendance>,

        @InjectRepository(CourseRegistration)
        private readonly registrationRepo: Repository<CourseRegistration>,

        @InjectRepository(Grade)
        private readonly gradeRepo: Repository<Grade>,

        @InjectRepository(AdminClass)
        private readonly classRepo: Repository<AdminClass>,

        @InjectRepository(Department)
        private departmentRepo: Repository<Department>,

        @InjectRepository(CurriculumSubject)
        private readonly curriculumSubjectRepository: Repository<CurriculumSubject>,

        private readonly dataSource: DataSource,
    ) {}

    async create(createUserDto: CreateUserDto) {
        const {
            role,
            password,
            phone,
            class_id,
            major_id,
            departmentId,
            yearOfAdmissionId,
            specialization,
            degree,
            ...rest
        } = createUserDto;

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 1. Check email
            const existingEmail = await queryRunner.manager.findOne(User, {
                where: { email: createUserDto.email },
            });
            if (existingEmail) {
                throw new BadRequestException('Email already exists');
            }

            // 2. Check role
            const roleEntity = await queryRunner.manager.findOne(Role, {
                where: { id: role },
            });
            if (!roleEntity) {
                throw new BadRequestException('Role not found');
            }

            // 3. Check phone nếu có nhập
            if (phone) {
                const validPhone = isValidPhone(phone);
                if (!validPhone) {
                    throw new BadRequestException('Phone number is not valid');
                }

                const existingPhone = await queryRunner.manager.findOne(User, {
                    where: { phone },
                });
                if (existingPhone) {
                    throw new BadRequestException(
                        'Phone number already exists',
                    );
                }
            }

            // 4. Hash password
            const hashedPassword = await getHashPassword(password);

            // 5. Tạo user object
            const user = this.usersRepository.create({
                ...rest,
                role_id: roleEntity.id,
                password: hashedPassword,
                phone,
            });

            // ================= ADMIN =================
            if (roleEntity.name === ADMIN_ROLE) {
                const savedUser = await queryRunner.manager.save(User, user);
                await queryRunner.commitTransaction();
                return savedUser;
            }

            // ================= STUDENT =================
            if (roleEntity.name === STUDENT_ROLE) {
                if (!major_id || !yearOfAdmissionId) {
                    throw new BadRequestException(
                        'Missing student information: major_id or yearOfAdmissionId',
                    );
                }

                const [major, classEntity, admissionYear] = await Promise.all([
                    queryRunner.manager.findOne(Major, {
                        where: { id: major_id },
                    }),
                    class_id
                        ? queryRunner.manager.findOne(AdminClass, {
                              where: { id: class_id },
                          })
                        : Promise.resolve(null),
                    queryRunner.manager.findOne(YearOfAdmission, {
                        where: { id: yearOfAdmissionId },
                    }),
                ]);

                if (!major) {
                    throw new BadRequestException('Major not found');
                }

                if (!admissionYear) {
                    throw new BadRequestException('Admission year not found');
                }

                const savedUser = await queryRunner.manager.save(User, user);

                const mssv = await this.generateMssv(admissionYear);

                const student = this.studentRepo.create({
                    user_id: savedUser.id,
                    mssv,
                    major_id,
                    adminClassId: classEntity?.id,
                    yearOfAdmissionId: admissionYear.id,
                });

                await queryRunner.manager.save(Student, student);
                await queryRunner.commitTransaction();

                return await this.usersRepository.findOne({
                    where: { id: savedUser.id },
                    relations: {
                        student: true, // sửa theo relation thật trong User entity
                    },
                });
            }

            // ================= TEACHER =================
            if (roleEntity.name === TEACHER_ROLE) {
                if (!departmentId) {
                    throw new BadRequestException('Department is required');
                }

                if (!degree) {
                    throw new BadRequestException('Degree is required');
                }

                const department = await queryRunner.manager.findOne(
                    Department,
                    {
                        where: { id: departmentId },
                    },
                );

                if (!department) {
                    throw new BadRequestException('Department not found');
                }

                const savedUser = await queryRunner.manager.save(User, user);

                const count = await queryRunner.manager.count(Teacher);
                const msgv = `GV${String(count + 1).padStart(5, '0')}`;

                const teacher = new Teacher();
                teacher.user_id = savedUser.id;
                teacher.msgv = msgv;
                teacher.specialization = specialization || undefined;
                teacher.degree = degree;
                teacher.department_id = departmentId;

                await queryRunner.manager.save(Teacher, teacher);
                await queryRunner.commitTransaction();

                return await this.usersRepository.findOne({
                    where: { id: savedUser.id },
                    relations: {
                        teacher: true, // sửa theo relation thật trong User entity
                    },
                });
            }

            throw new BadRequestException('Invalid role');
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
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
            textSearchFields: ['name', 'email'],
            exactFields: ['role_id', 'isActive'],
            relationILike: {
                role: { relation: 'role', field: 'name' },
            },
            ignoreFilters: ['current', 'pageSize'],
            defaultSort: { id: 'DESC' },
        });

        const finalWhere: any = {
            ...where,
        };

        // mặc định không lấy admin
        finalWhere.role = {
            ...(where as any)?.role,
            name: Not(ADMIN_ROLE),
        };

        // nếu FE truyền role.name=teacher hoặc role=teacher
        const query = new URLSearchParams(qs);
        const roleName =
            query.get('role.name') ||
            query.get('role') ||
            query.get('roleName');

        if (roleName) {
            finalWhere.role = {
                ...(where as any)?.role,
                name: ILike(`%${roleName}%`),
            };
        }

        const totalItems = await this.usersRepository.count({
            where: finalWhere,
            withDeleted: true,
            relations: {
                role: true,
            },
        });

        const totalPages = Math.ceil(totalItems / pageLimit);

        const result = await this.usersRepository.find({
            where: finalWhere,
            skip: offset,
            take: pageLimit,
            withDeleted: true,
            order,
            relations: {
                role: true,
                student: {
                    major: true,
                    yearOfAdmission: true,
                    adminClass: true,
                },
                teacher: {
                    department: true,
                },
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

    findOne(id: string) {
        return this.usersRepository.findOne({
            where: { id: id },
            relations: {
                role: true,
                student: {
                    major: true,
                    yearOfAdmission: true,
                    adminClass: true,
                },
                teacher: {
                    department: true,
                    teacherSubjects: {
                        subject: true,
                    },
                },
            },
        });
    }

    async update(id: string, updateUserDto: UpdateUserDto) {
        const userUpdate = await this.usersRepository.findOne({
            where: { id },
        });

        if (!userUpdate) {
            throw new NotFoundException(`User với ID ${id} không tồn tại`);
        }

        const { role, ...rest } = updateUserDto;
        const updateData = role ? { ...rest, role_id: role } : rest;

        await this.usersRepository.update({ id }, updateData);

        return this.usersRepository.findOne({
            where: { id },
        });
    }

    async remove(id: string) {
        const foundUser = await this.usersRepository.findOneBy({
            id,
        });
        if (!foundUser) return `not found user`;

        if (foundUser && foundUser.email === EMAIL_ADMIN) {
            throw new BadRequestException(
                'Không thể Xóa tài khoản admin@gmail.com thì lấy gì test',
            );
        }

        return await this.usersRepository.update(
            { id: id },
            {
                isActive: false,
                deletedAt: new Date(),
            },
        );
    }

    findOneByUsername(username: string) {
        return this.usersRepository.findOne({ where: { email: username } });
    }

    updateUserToken = async (refreshToken: string, id: string) => {
        return await this.usersRepository.update({ id }, { refreshToken });
    };

    findUserByToken = async (refreshToken: string) => {
        return await this.usersRepository.findOne({
            where: { refreshToken: refreshToken },
            relations: ['role'],
            select: {
                role: { id: true, name: true },
            },
        });
    };

    generateMssv = async (admissionYear: YearOfAdmission): Promise<string> => {
        const yearShort = admissionYear.year % 100; // 2023 -> 23
        const prefix = yearShort.toString().padStart(2, '0'); // '23'

        const lastStudent = await this.studentRepo
            .createQueryBuilder('s')
            .where('s.id = :id', { id: admissionYear.id })
            .andWhere('s.mssv LIKE :prefix', { prefix: `${prefix}%` })
            .orderBy('s.mssv', 'DESC')
            .getOne();

        let nextNumber = 1;
        if (lastStudent?.mssv) {
            const num = parseInt(lastStudent.mssv.slice(2), 10); // lấy phần sau '23'
            nextNumber = num + 1;
        }

        const seq = nextNumber.toString().padStart(4, '0'); // 0001
        return `${prefix}${seq}`; // 230001
    };

    // generateMssvMany = async (
    //     manager: EntityManager,
    //     admissionYear: YearOfAdmission,
    // ): Promise<string> => {
    //     const yearShort = admissionYear.year % 100; // 2025 -> 25
    //     const prefix = yearShort.toString().padStart(2, '0'); // "25"

    //     const lastStudent = await manager
    //         .getRepository(Student)
    //         .createQueryBuilder('s')
    //         .where('s.yearOfAdmissionId = :yearId', {
    //             yearId: admissionYear.id,
    //         })
    //         .andWhere('s.mssv LIKE :prefix', { prefix: `${prefix}%` })
    //         .orderBy('s.mssv', 'DESC')
    //         .getOne();

    //     let nextNumber = 1;

    //     if (lastStudent?.mssv) {
    //         const num = parseInt(lastStudent.mssv.slice(2), 10); // VD: 250001 -> 1
    //         nextNumber = num + 1;
    //     }

    //     const seq = nextNumber.toString().padStart(4, '0'); // 0001
    //     return `${prefix}${seq}`; // 250001
    // };

    // async importStudentsExcel(dto: ImportStudentExcelDto) {
    //     const inserted: any[] = [];
    //     const skipped: any[] = [];

    //     const studentRole = await this.rolesRepository.findOne({
    //         where: { name: STUDENT_ROLE },
    //     });

    //     if (!studentRole) {
    //         throw new BadRequestException('Không tìm thấy role STUDENT');
    //     }

    //     for (const item of dto.items) {
    //         try {
    //             const email = item.email?.trim().toLowerCase();
    //             const name = item.name?.trim();
    //             const majorName = item.majorName?.trim();
    //             const className = item.className?.trim();
    //             const password = item.password?.trim();

    //             if (!email || !name || !majorName || !className || !password) {
    //                 skipped.push({
    //                     ...item,
    //                     reason: 'Thiếu thông tin bắt buộc',
    //                 });
    //                 continue;
    //             }

    //             if (item.phone && !isValidPhone(item.phone)) {
    //                 skipped.push({
    //                     ...item,
    //                     reason: 'Số điện thoại không hợp lệ',
    //                 });
    //                 continue;
    //             }

    //             const existedUser = await this.usersRepository.findOne({
    //                 where: { email },
    //                 withDeleted: true,
    //             });

    //             if (existedUser) {
    //                 skipped.push({
    //                     ...item,
    //                     reason: `Email ${email} đã tồn tại`,
    //                 });
    //                 continue;
    //             }

    //             const major = await this.majorRepo.findOne({
    //                 where: { name: majorName },
    //             });

    //             if (!major) {
    //                 skipped.push({
    //                     ...item,
    //                     reason: `Không tìm thấy chuyên ngành ${majorName}`,
    //                 });
    //                 continue;
    //             }

    //             const adminClass = await this.classRepo.findOne({
    //                 where: { name: className },
    //             });

    //             if (!adminClass) {
    //                 skipped.push({
    //                     ...item,
    //                     reason: `Không tìm thấy lớp ${className}`,
    //                 });
    //                 continue;
    //             }

    //             const year = await this.yearOfAdmissionRepo.findOne({
    //                 where: { year: item.yearAdmission },
    //             });

    //             if (!year) {
    //                 skipped.push({
    //                     ...item,
    //                     reason: `Không tìm thấy năm nhập học ${item.yearAdmission}`,
    //                 });
    //                 continue;
    //             }

    //             const hashedPassword = await getHashPassword(password);

    //             const result = await this.dataSource.transaction(
    //                 async (manager) => {
    //                     const mssv = await this.generateMssvMany(manager, year);

    //                     const user = manager.create(User, {
    //                         name,
    //                         email,
    //                         password: hashedPassword,
    //                         gender: item.gender,
    //                         phone: item.phone?.trim(),
    //                         role_id: studentRole.id,
    //                     });

    //                     const savedUser = await manager.save(User, user);

    //                     const student = manager.create(Student, {
    //                         user_id: savedUser.id,
    //                         major_id: major.id,
    //                         adminClassId: adminClass.id,
    //                         yearOfAdmissionId: year.id,
    //                         mssv,
    //                     });

    //                     const savedStudent = await manager.save(
    //                         Student,
    //                         student,
    //                     );

    //                     return {
    //                         user: savedUser,
    //                         student: savedStudent,
    //                     };
    //                 },
    //             );

    //             inserted.push({
    //                 id: result.user.id,
    //                 name,
    //                 email,
    //                 majorName,
    //                 className,
    //                 yearAdmission: item.yearAdmission,
    //                 mssv: result.student.mssv,
    //             });
    //         } catch (error) {
    //             skipped.push({
    //                 ...item,
    //                 reason:
    //                     error instanceof Error
    //                         ? error.message
    //                         : 'Có lỗi xảy ra khi import student',
    //             });
    //         }
    //     }

    //     return {
    //         message:
    //             inserted.length > 0
    //                 ? `Import thành công ${inserted.length} sinh viên`
    //                 : 'Không có sinh viên nào được import',
    //         data: {
    //             countSuccess: inserted.length,
    //             countError: skipped.length,
    //             success: inserted,
    //             skipped,
    //         },
    //     };
    // }

    async importStudentsExcel(dto: ImportStudentExcelDto) {
        const inserted: any[] = [];
        const skipped: any[] = [];

        const studentRole = await this.rolesRepository.findOne({
            where: { name: STUDENT_ROLE },
        });

        if (!studentRole) {
            throw new BadRequestException('Không tìm thấy role STUDENT');
        }

        for (const item of dto.items) {
            try {
                const email = item.email?.trim().toLowerCase();
                const name = item.name?.trim();
                const majorName = item.majorName?.trim();
                const className = item.className?.trim();
                const password = item.password?.trim();

                if (!email || !name || !majorName || !password) {
                    skipped.push({
                        ...item,
                        reason: 'Thiếu thông tin bắt buộc',
                    });
                    continue;
                }

                if (item.phone && !isValidPhone(item.phone)) {
                    skipped.push({
                        ...item,
                        reason: 'Số điện thoại không hợp lệ',
                    });
                    continue;
                }

                const existedUser = await this.usersRepository.findOne({
                    where: { email },
                    withDeleted: true,
                });

                if (existedUser) {
                    skipped.push({
                        ...item,
                        reason: `Email ${email} đã tồn tại`,
                    });
                    continue;
                }

                const major = await this.majorRepo.findOne({
                    where: { name: majorName },
                });

                if (!major) {
                    skipped.push({
                        ...item,
                        reason: `Không tìm thấy chuyên ngành ${majorName}`,
                    });
                    continue;
                }

                const year = await this.yearOfAdmissionRepo.findOne({
                    where: { year: item.yearAdmission },
                });

                if (!year) {
                    skipped.push({
                        ...item,
                        reason: `Không tìm thấy năm nhập học ${item.yearAdmission}`,
                    });
                    continue;
                }

                const hashedPassword = await getHashPassword(password);

                const result = await this.dataSource.transaction(
                    async (manager) => {
                        let adminClass: AdminClass | null = null;

                        // 1) Nếu có className => tìm lớp theo tên
                        if (className) {
                            adminClass = await manager.findOne(AdminClass, {
                                where: { name: className },
                            });

                            if (!adminClass) {
                                throw new BadRequestException(
                                    `Không tìm thấy lớp ${className}`,
                                );
                            }

                            if (
                                adminClass.status === AdminClassStatus.GRADUATED
                            ) {
                                throw new BadRequestException(
                                    `Lớp ${adminClass.name} đã tốt nghiệp, không thể thêm sinh viên`,
                                );
                            }

                            if (adminClass.major_id !== major.id) {
                                throw new BadRequestException(
                                    `Lớp ${adminClass.name} không thuộc chuyên ngành ${majorName}`,
                                );
                            }

                            if (adminClass.yearOfAdmissionId !== year.id) {
                                throw new BadRequestException(
                                    `Lớp ${adminClass.name} không thuộc năm nhập học ${item.yearAdmission}`,
                                );
                            }

                            await this.validateClassCapacity(
                                manager,
                                adminClass.id,
                                1,
                            );

                            // Nếu lớp đang PENDING thì khi thêm SV sẽ chuyển sang STUDYING
                            if (
                                adminClass.status === AdminClassStatus.PENDING
                            ) {
                                adminClass.status = AdminClassStatus.STUDYING;
                                adminClass = await manager.save(
                                    AdminClass,
                                    adminClass,
                                );
                            }
                        } else {
                            // 2) Không có className => auto chia lớp
                            adminClass =
                                await this.findOrCreateAvailableAdminClass(
                                    manager,
                                    major.id,
                                    year.id,
                                );

                            if (!adminClass) {
                                throw new BadRequestException(
                                    'Không thể tự động xếp lớp cho sinh viên',
                                );
                            }

                            if (
                                adminClass.status === AdminClassStatus.GRADUATED
                            ) {
                                throw new BadRequestException(
                                    `Lớp ${adminClass.name} đã tốt nghiệp, không thể thêm sinh viên`,
                                );
                            }

                            if (adminClass.major_id !== major.id) {
                                throw new BadRequestException(
                                    `Lớp ${adminClass.name} không thuộc chuyên ngành ${majorName}`,
                                );
                            }

                            if (adminClass.yearOfAdmissionId !== year.id) {
                                throw new BadRequestException(
                                    `Lớp ${adminClass.name} không thuộc năm nhập học ${item.yearAdmission}`,
                                );
                            }

                            await this.validateClassCapacity(
                                manager,
                                adminClass.id,
                                1,
                            );

                            // Nếu auto chia vào lớp PENDING thì chuyển sang STUDYING
                            if (
                                adminClass.status === AdminClassStatus.PENDING
                            ) {
                                adminClass.status = AdminClassStatus.STUDYING;
                                adminClass = await manager.save(
                                    AdminClass,
                                    adminClass,
                                );
                            }
                        }

                        const mssv = await this.generateMssvMany(manager, year);

                        const user = manager.create(User, {
                            name,
                            email,
                            password: hashedPassword,
                            gender: item.gender,
                            phone: item.phone?.trim(),
                            role_id: studentRole.id,
                        });

                        const savedUser = await manager.save(User, user);

                        const student = manager.create(Student, {
                            user_id: savedUser.id,
                            major_id: major.id,
                            adminClassId: adminClass.id,
                            yearOfAdmissionId: year.id,
                            mssv,
                        });

                        const savedStudent = await manager.save(
                            Student,
                            student,
                        );

                        return {
                            user: savedUser,
                            student: savedStudent,
                            adminClass,
                        };
                    },
                );

                inserted.push({
                    id: result.user.id,
                    name,
                    email,
                    majorName,
                    className: result.adminClass.name,
                    yearAdmission: item.yearAdmission,
                    mssv: result.student.mssv,
                    classStatus: result.adminClass.status,
                });
            } catch (error) {
                skipped.push({
                    ...item,
                    reason:
                        error instanceof Error
                            ? error.message
                            : 'Có lỗi xảy ra khi import sinh viên',
                });
            }
        }

        return {
            message:
                inserted.length > 0
                    ? `Import thành công ${inserted.length} sinh viên`
                    : 'Không có sinh viên nào được import',
            data: {
                countSuccess: inserted.length,
                countError: skipped.length,
                success: inserted,
                skipped,
            },
        };
    }

    /**
     * Kiểm tra lớp còn chỗ hay không
     */
    private async validateClassCapacity(
        manager: EntityManager,
        adminClassId: number,
        incomingCount = 1,
    ) {
        const adminClass = await manager.findOne(AdminClass, {
            where: { id: adminClassId },
        });

        if (!adminClass) {
            throw new BadRequestException('Không tìm thấy lớp hành chính');
        }

        const currentCount = await manager.count(Student, {
            where: { adminClassId },
        });

        if (currentCount + incomingCount > adminClass.capacity) {
            throw new BadRequestException(
                `Lớp ${adminClass.name} đã đầy (${currentCount}/${adminClass.capacity})`,
            );
        }

        return {
            adminClass,
            currentCount,
            remaining: adminClass.capacity - currentCount,
        };
    }

    /**
     * Tìm lớp còn chỗ theo major + yearOfAdmission
     * Nếu không còn lớp nào thì tự tạo lớp mới
     */
    private async findOrCreateAvailableAdminClass(
        manager: EntityManager,
        majorId: number,
        yearOfAdmissionId: number,
    ): Promise<AdminClass> {
        const classes = await manager.find(AdminClass, {
            where: {
                major_id: majorId,
                yearOfAdmissionId,
            },
            order: {
                id: 'ASC',
            },
        });

        for (const adminClass of classes) {
            if (adminClass.status === AdminClassStatus.GRADUATED) {
                continue;
            }

            const currentCount = await manager.count(Student, {
                where: { adminClassId: adminClass.id },
            });

            if (currentCount < adminClass.capacity) {
                return adminClass;
            }
        }

        return await this.createAdminClassAuto(
            manager,
            majorId,
            yearOfAdmissionId,
        );
    }

    /**
     * Tự tạo lớp mới khi các lớp hiện tại đã đầy
     * Ví dụ: CNTT_K25_01 -> CNTT_K25_02
     */
    private async createAdminClassAuto(
        manager: EntityManager,
        majorId: number,
        yearOfAdmissionId: number,
    ): Promise<AdminClass> {
        const major = await manager.findOne(Major, {
            where: { id: majorId },
        });

        if (!major) {
            throw new BadRequestException('Không tìm thấy chuyên ngành');
        }

        const year = await manager.findOne(YearOfAdmission, {
            where: { id: yearOfAdmissionId },
        });

        if (!year) {
            throw new BadRequestException('Không tìm thấy năm nhập học');
        }

        const existingClasses = await manager.find(AdminClass, {
            where: {
                major_id: majorId,
                yearOfAdmissionId,
            },
            order: {
                id: 'ASC',
            },
        });

        const nextIndex = existingClasses.length + 1;
        const yearShort = String(year.year).slice(-2);
        const classIndex = String(nextIndex).padStart(2, '0');

        const code = `${major.code}_K${yearShort}_${classIndex}`;
        const name = `${major.name} K${yearShort} lớp ${nextIndex}`;

        const existedCode = await manager.findOne(AdminClass, {
            where: { code },
        });

        if (existedCode) {
            throw new BadRequestException(
                `Mã lớp ${code} đã tồn tại, không thể tự tạo lớp mới`,
            );
        }

        const adminClass = manager.create(AdminClass, {
            code,
            name,
            capacity: 50,
            major_id: majorId,
            yearOfAdmissionId,
            status: AdminClassStatus.PENDING,
        });

        return await manager.save(AdminClass, adminClass);
    }

    /**
     * Hàm này là hàm bạn đã có sẵn trong service
     * Giữ nguyên logic cũ của bạn
     */
    private async generateMssvMany(
        manager: EntityManager,
        year: YearOfAdmission,
    ) {
        const yearShort = String(year.year).slice(-2);

        const count = await manager.count(Student, {
            where: { yearOfAdmissionId: year.id },
        });

        const sequence = String(count + 1).padStart(4, '0');
        return `${yearShort}${sequence}`;
    }

    //     async importTeachersExcel(dto: ImportTeacherExcelDto) {
    //     const inserted: any[] = [];
    //     const skipped: any[] = [];

    //     const teacherRole = await this.roleRepository.findOne({
    //         where: { name: TEACHER_ROLE },
    //     });

    //     if (!teacherRole) {
    //         throw new BadRequestException('Không tìm thấy role TEACHER');
    //     }

    //     for (const item of dto.items) {
    //         try {
    //             const email = item.email.trim().toLowerCase();
    //             const name = item.name.trim();
    //             const departmentName = item.departmentName.trim();

    //             if (item.phone && !isValidPhone(item.phone)) {
    //                 skipped.push({
    //                     ...item,
    //                     reason: 'Số điện thoại không hợp lệ',
    //                 });
    //                 continue;
    //             }

    //             const existedUser = await this.userRepository.findOne({
    //                 where: { email },
    //             });

    //             if (existedUser) {
    //                 skipped.push({
    //                     ...item,
    //                     reason: `Email ${email} đã tồn tại`,
    //                 });
    //                 continue;
    //             }

    //             const department = await this.departmentRepository.findOne({
    //                 where: { name: departmentName },
    //             });

    //             if (!department) {
    //                 skipped.push({
    //                     ...item,
    //                     reason: `Không tìm thấy bộ môn ${departmentName}`,
    //                 });
    //                 continue;
    //             }

    //             const hashedPassword = await getHashPassword(item.password);

    //             const result = await this.dataSource.transaction(async (manager) => {
    //                 const user = manager.create(User, {
    //                     name,
    //                     email,
    //                     password: hashedPassword,
    //                     gender: item.gender,
    //                     roleId: teacherRole.id,
    //                     phone: item.phone?.trim() || null,
    //                 });

    //                 const savedUser = await manager.save(User, user);

    //                 const teacher = manager.create(Teacher, {
    //                     userId: savedUser.id,
    //                     department_id: department.id,
    //                     specialization: item.specialization?.trim() || null,
    //                 });

    //                 await manager.save(Teacher, teacher);

    //                 return savedUser;
    //             });

    //             inserted.push({
    //                 ...result,
    //                 departmentName,
    //                 specialization: item.specialization || null,
    //             });
    //         } catch (error) {
    //             skipped.push({
    //                 ...item,
    //                 reason:
    //                     error instanceof Error
    //                         ? error.message
    //                         : 'Có lỗi xảy ra khi import giảng viên',
    //             });
    //         }
    //     }

    //     return {
    //         message:
    //             inserted.length > 0
    //                 ? `Import thành công ${inserted.length} giảng viên`
    //                 : 'Không có giảng viên nào được import',
    //         data: {
    //             countSuccess: inserted.length,
    //             countError: skipped.length,
    //             success: inserted,
    //             errors: skipped,
    //         },
    //     };
    // }

    async findTeachers(currentPage: number, limit: number, qs: string) {
        const queryParams = new URLSearchParams(qs);

        const facultyId = queryParams.get('facultyId');
        const departmentId = queryParams.get('department_id');
        const keyword = queryParams.get('keyword');
        const isActive = queryParams.get('isActive');

        // thêm param tùy chọn
        const excludeAssignedAdvisor = queryParams.get(
            'excludeAssignedAdvisor',
        );
        const onlyPrimaryAdvisor = queryParams.get('onlyPrimaryAdvisor');

        const page = Number(currentPage) > 0 ? Number(currentPage) : 1;
        const pageSize = Number(limit) > 0 ? Number(limit) : 10;
        const skip = (page - 1) * pageSize;

        const qb = this.teacherRepo
            .createQueryBuilder('teacher')
            .leftJoinAndSelect('teacher.user', 'user')
            .leftJoinAndSelect('teacher.department', 'department')
            .leftJoinAndSelect('department.faculty', 'faculty')
            .leftJoinAndSelect('teacher.teacherSubjects', 'teacherSubjects')
            .leftJoinAndSelect('teacherSubjects.subject', 'subject');

        if (facultyId) {
            qb.andWhere('department.facultyId = :facultyId', {
                facultyId: Number(facultyId),
            });
        }

        if (departmentId) {
            qb.andWhere('teacher.department_id = :departmentId', {
                departmentId: Number(departmentId),
            });
        }

        if (keyword) {
            qb.andWhere(
                `(user.name ILIKE :keyword
              OR user.email ILIKE :keyword
              OR teacher.msgv ILIKE :keyword
              OR teacher.specialization ILIKE :keyword
              OR teacher.degree ILIKE :keyword
              OR department.name ILIKE :keyword)`,
                { keyword: `%${keyword}%` },
            );
        }

        if (isActive !== undefined && isActive !== null && isActive !== '') {
            qb.andWhere('user.isActive = :isActive', {
                isActive: isActive === 'true',
            });
        }

        // loại giảng viên đã có lớp hướng dẫn
        if (excludeAssignedAdvisor === 'true') {
            if (onlyPrimaryAdvisor === 'true') {
                qb.leftJoin(
                    'teacher.advisorLinks',
                    'advisor',
                    'advisor.endAt IS NULL AND advisor.isPrimary = true',
                );
            } else {
                qb.leftJoin(
                    'teacher.advisorLinks',
                    'advisor',
                    'advisor.endAt IS NULL',
                );
            }

            qb.andWhere('advisor.id IS NULL');
        }

        qb.orderBy('teacher.id', 'DESC').skip(skip).take(pageSize);

        const [result, totalItems] = await qb.getManyAndCount();

        return {
            result,
            meta: {
                current: page,
                pageSize,
                pages: Math.ceil(totalItems / pageSize),
                total: totalItems,
            },
        };
    }

    async getMyProfile(userId: string) {
        const teacher = await this.teacherRepo.findOne({
            where: {
                user: {
                    id: userId,
                },
            },
            relations: {
                user: true,
                teacherSubjects: {
                    subject: true,
                },
                department: true,
            },
        });

        if (!teacher) {
            throw new NotFoundException('Không tìm thấy giáo viên');
        }

        const courses = await this.courseOfferingRepo.find({
            where: {
                teacherSubject: {
                    teacher: {
                        id: teacher.id,
                    },
                },
            },
            relations: {
                term: true,
                adminClass: true,
                schedules: {
                    room: true,
                },
                teacherSubject: {
                    subject: true,
                },
                courseRegistrations: true,
                lessons: true,
            },
            order: {
                id: 'DESC',
            },
        });

        const totalStudents = courses.reduce(
            (sum, item) => sum + (item.courseRegistrations?.length || 0),
            0,
        );

        const totalLessons = courses.reduce(
            (sum, item) => sum + (item.lessons?.length || 0),
            0,
        );

        return {
            teacher,
            subjects: teacher.teacherSubjects?.map((ts) => ts.subject) || [],
            courses,
            stats: {
                totalSubjects: teacher.teacherSubjects?.length || 0,
                totalCourses: courses.length,
                totalStudents,
                totalLessons,
            },
        };
    }

    private async getStudentByUserId(userId: string) {
        const student = await this.studentRepo.findOne({
            where: {
                user: {
                    id: userId,
                },
            },
            relations: {
                user: true,
            },
        });

        if (!student) {
            throw new NotFoundException('Không tìm thấy sinh viên');
        }

        return student;
    }

    private async getActiveRegistrations(studentId: number) {
        return this.registrationRepo.find({
            where: {
                student: {
                    id: studentId,
                },
                status: RegistrationStatus.REGISTERED,
                courseOffering: {
                    term: {
                        isActive: true,
                    },
                },
            },
            relations: {
                courseOffering: {
                    term: true,
                    adminClass: true,
                    teacherSubject: {
                        teacher: {
                            user: true,
                        },
                        subject: true,
                    },
                    schedules: {
                        room: true,
                    },
                    lessons: true,
                },
            },
        });
    }

    async getSummary(userId: string) {
        const student = await this.getStudentByUserId(userId);
        const registrations = await this.getActiveRegistrations(student.id);

        const registrationIds = registrations.map((item) => item.id);

        const totalCourses = registrations.length;

        const totalCredits = registrations.reduce((sum, item) => {
            const credit =
                item.courseOffering?.teacherSubject?.subject?.credit || 0;

            return sum + Number(credit);
        }, 0);

        const attendances = registrationIds.length
            ? await this.attendanceRepo.find({
                  where: {
                      registrationId: In(registrationIds),
                  },
              })
            : [];

        const attendedCount = attendances.filter((item) =>
            ['PRESENT', 'LATE'].includes(String(item.status)),
        ).length;

        const attendancePercent = attendances.length
            ? Math.round((attendedCount / attendances.length) * 100)
            : 0;

        const grades = registrationIds.length
            ? await this.gradeRepo.find({
                  where: {
                      registrationId: In(registrationIds),
                      isPublished: true,
                  },
              })
            : [];

        const gpa = grades.length
            ? Number(
                  (
                      grades.reduce((sum, grade) => {
                          return (
                              sum +
                              this.convertTotalScoreToGpa(
                                  Number(grade.totalScore || 0),
                              )
                          );
                      }, 0) / grades.length
                  ).toFixed(2),
              )
            : 0;

        return {
            totalCourses,
            totalCredits,
            attendancePercent,
            gpa,
        };
    }

    async getTodaySchedules(userId: string) {
        const student = await this.getStudentByUserId(userId);
        const registrations = await this.getActiveRegistrations(student.id);

        const today = dayjs();

        /**
         * Nếu DB của bạn lưu:
         * Thứ 2 = 2, Thứ 3 = 3, ..., Chủ nhật = 8
         */
        const currentDayOfWeek = today.day() === 0 ? 8 : today.day() + 1;

        const result = registrations.flatMap((registration) => {
            const courseOffering = registration.courseOffering;

            return (courseOffering?.schedules || [])
                .filter((schedule) => schedule.dayOfWeek === currentDayOfWeek)
                .map((schedule) => {
                    const start = this.getLessonTime(
                        schedule.lessonStart,
                    )?.start;

                    const end = this.getLessonTime(schedule.lessonEnd)?.end;

                    return {
                        id: schedule.id,
                        courseOfferingId: courseOffering.id,
                        subject:
                            courseOffering.teacherSubject?.subject?.name || '',
                        code: courseOffering.code,
                        className:
                            courseOffering.adminClass?.name ||
                            courseOffering.code,
                        teacher:
                            courseOffering.teacherSubject?.teacher?.user
                                ?.name || 'Chưa có giảng viên',
                        room: schedule.room?.name || 'Chưa có phòng',
                        time: `${start || '--:--'} - ${end || '--:--'}`,
                        status: this.getScheduleStatus(start, end),
                    };
                });
        });

        return result.sort((a, b) => a.time.localeCompare(b.time));
    }

    async getCourseProgress(userId: string) {
        const student = await this.getStudentByUserId(userId);
        const registrations = await this.getActiveRegistrations(student.id);

        return registrations.map((registration) => {
            const courseOffering = registration.courseOffering;
            const lessons = courseOffering?.lessons || [];

            const totalLessons = lessons.length;

            const completedLessons = lessons.filter(
                (lesson) => String(lesson.status) === 'COMPLETED',
            ).length;

            const progress = totalLessons
                ? Math.round((completedLessons / totalLessons) * 100)
                : 0;

            return {
                id: courseOffering.id,
                registrationId: registration.id,
                subject: courseOffering.teacherSubject?.subject?.name || '',
                code: courseOffering.code,
                teacher:
                    courseOffering.teacherSubject?.teacher?.user?.name ||
                    'Chưa có giảng viên',
                totalLessons,
                completedLessons,
                progress,
            };
        });
    }

    async getLatestGrades(userId: string) {
        const student = await this.getStudentByUserId(userId);
        const registrations = await this.getActiveRegistrations(student.id);

        const registrationIds = registrations.map((item) => item.id);

        const grades = registrationIds.length
            ? await this.gradeRepo.find({
                  where: {
                      registrationId: In(registrationIds),
                      isPublished: true,
                  },
                  order: {
                      updatedAt: 'DESC',
                  },
                  take: 8,
              })
            : [];

        return grades.map((grade) => {
            const registration = registrations.find(
                (item) => item.id === grade.registrationId,
            );

            const courseOffering = registration?.courseOffering;
            const subject = courseOffering?.teacherSubject?.subject;

            return {
                id: grade.id,
                registrationId: grade.registrationId,
                subject: subject?.name || '',
                code: subject?.code || courseOffering?.code || '',
                attendanceScore: Number(grade.attendanceScore || 0),
                midtermScore: Number(grade.midtermScore || 0),
                finalScore: Number(grade.finalScore || 0),
                totalScore: Number(grade.totalScore || 0),
                letterGrade: grade.letterGrade,
                isPassed: grade.isPassed,
            };
        });
    }

    async getAttendanceOverview(userId: string) {
        const student = await this.getStudentByUserId(userId);
        const registrations = await this.getActiveRegistrations(student.id);

        const registrationIds = registrations.map((item) => item.id);

        const attendances = registrationIds.length
            ? await this.attendanceRepo.find({
                  where: {
                      registrationId: In(registrationIds),
                  },
              })
            : [];

        const total = attendances.length;

        const present = attendances.filter(
            (item) => String(item.status) === 'PRESENT',
        ).length;

        const late = attendances.filter(
            (item) => String(item.status) === 'LATE',
        ).length;

        const absent = attendances.filter(
            (item) => String(item.status) === 'ABSENT',
        ).length;

        const attendancePercent = total
            ? Math.round(((present + late) / total) * 100)
            : 0;

        return {
            total,
            present,
            late,
            absent,
            attendancePercent,
        };
    }

    private getScheduleStatus(startTime?: string, endTime?: string) {
        if (!startTime || !endTime) return 'Sắp tới';

        const now = dayjs();

        const start = dayjs(
            `${now.format('YYYY-MM-DD')} ${startTime}`,
            'YYYY-MM-DD HH:mm',
        );

        const end = dayjs(
            `${now.format('YYYY-MM-DD')} ${endTime}`,
            'YYYY-MM-DD HH:mm',
        );

        if (now.isBefore(start)) return 'Sắp tới';
        if (now.isAfter(end)) return 'Đã kết thúc';

        return 'Đang diễn ra';
    }

    private getLessonTime(lesson: number) {
        const LESSON_TIME_MAP: Record<number, { start: string; end: string }> =
            {
                1: { start: '07:00', end: '07:50' },
                2: { start: '07:50', end: '08:40' },
                3: { start: '08:50', end: '09:40' },
                4: { start: '09:40', end: '10:30' },
                5: { start: '10:40', end: '11:30' },
                6: { start: '13:00', end: '13:50' },
                7: { start: '13:50', end: '14:40' },
                8: { start: '14:50', end: '15:40' },
                9: { start: '15:40', end: '16:30' },
                10: { start: '19:55', end: '20:30' },
                11: { start: '20:30', end: '21:20' },
            };

        return LESSON_TIME_MAP[lesson];
    }

    private convertTotalScoreToGpa(score: number) {
        if (score >= 8.5) return 4.0;
        if (score >= 8.0) return 3.5;
        if (score >= 7.0) return 3.0;
        if (score >= 6.5) return 2.5;
        if (score >= 5.5) return 2.0;
        if (score >= 5.0) return 1.5;
        if (score >= 4.0) return 1.0;

        return 0;
    }

    async getStatistics() {
        const [totalUsers, totalStudents, totalTeachers] = await Promise.all([
            this.usersRepository.count(),

            this.usersRepository.count({
                where: {
                    role: {
                        name: 'STUDENT',
                    },
                },
            }),

            this.usersRepository.count({
                where: {
                    role: {
                        name: 'TEACHER',
                    },
                },
            }),
        ]);

        return {
            totalUsers,
            totalStudents,
            totalTeachers,
        };
    }

    async getTeacherTeachingOverview(userId: string) {
        const teacher = await this.teacherRepo.findOne({
            where: {
                user: {
                    id: userId,
                },
            },
        });

        if (!teacher) {
            throw new NotFoundException('Không tìm thấy giảng viên');
        }

        const courses = await this.courseOfferingRepo.find({
            where: {
                teacherSubject: {
                    teacher: {
                        id: teacher.id,
                    },
                },
            },
            relations: {
                term: true,
                teacherSubject: {
                    subject: true,
                },
                courseRegistrations: true,
            },
            order: {
                id: 'DESC',
            },
        });

        return courses.map((item) => ({
            id: item.id,
            code: item.code,

            subjectName: item.teacherSubject?.subject?.name || 'N/A',

            subjectCode: item.teacherSubject?.subject?.code || 'N/A',

            credit: item.teacherSubject?.subject?.credit || 0,

            termName: item.term?.semester || 'N/A',

            year: item.term?.year || 0,

            status: item.status,

            totalStudents: item.courseRegistrations?.length || 0,
        }));
    }

    async getStudentLearningOverview(userId: string) {
        const student = await this.studentRepo.findOne({
            where: {
                user: {
                    id: userId,
                },
            },
            relations: {
                user: true,
                major: true,
                yearOfAdmission: true,
            },
        });

        if (!student) {
            throw new NotFoundException('Không tìm thấy sinh viên');
        }

        if (!student.major?.id || !student.yearOfAdmission?.id) {
            throw new BadRequestException(
                'Sinh viên chưa có ngành học hoặc năm nhập học',
            );
        }

        const curriculumSubjects = await this.curriculumSubjectRepository.find({
            where: {
                curriculum: {
                    major: {
                        id: student.major.id,
                    },
                    yearOfAdmission: {
                        id: student.yearOfAdmission.id,
                    },
                },
            },
            relations: {
                subject: true,
                curriculum: {
                    major: true,
                    yearOfAdmission: true,
                },
            },
        });

        const grades = await this.gradeRepo.find({
            where: {
                registration: {
                    student: {
                        id: student.id,
                    },
                },
            },
            relations: {
                registration: {
                    courseOffering: {
                        term: true,
                        teacherSubject: {
                            subject: true,
                        },
                    },
                },
            },
            order: {
                id: 'DESC',
            },
        });

        const totalCredits = curriculumSubjects.reduce((sum, item) => {
            return sum + Number(item.subject?.credit || 0);
        }, 0);

        const passedSubjectIds = new Set<number>();

        for (const grade of grades) {
            const subject =
                grade.registration?.courseOffering?.teacherSubject?.subject;

            if (!subject?.id) continue;
            if (!grade.isPublished) continue;
            if (!grade.isPassed) continue;

            passedSubjectIds.add(subject.id);
        }

        const passedCredits = curriculumSubjects.reduce((sum, item) => {
            if (!item.subject?.id) return sum;

            if (passedSubjectIds.has(item.subject.id)) {
                return sum + Number(item.subject.credit || 0);
            }

            return sum;
        }, 0);

        const publishedGrades = grades.filter((item) => item.isPublished);

        const totalScore = publishedGrades.reduce((sum, item) => {
            return sum + Number(item.totalScore || 0);
        }, 0);

        const gpa =
            publishedGrades.length > 0
                ? Number((totalScore / publishedGrades.length).toFixed(2))
                : 0;

        const progressPercent =
            totalCredits > 0
                ? Math.round((passedCredits / totalCredits) * 100)
                : 0;

        return {
            curriculum: {
                majorId: student.major.id,
                majorName: student.major.name,
                yearOfAdmissionId: student.yearOfAdmission.id,
                year: student.yearOfAdmission.year,
            },

            totalCurriculumSubjects: curriculumSubjects.length,
            totalCredits,
            passedCredits,
            remainingCredits: Math.max(totalCredits - passedCredits, 0),
            gpa,
            progressPercent,

            grades: grades.map((item) => {
                const subject =
                    item.registration?.courseOffering?.teacherSubject?.subject;

                return {
                    id: item.id,

                    subjectId: subject?.id || null,

                    subjectName: subject?.name || 'N/A',

                    subjectCode: subject?.code || 'N/A',

                    credit: subject?.credit || 0,

                    termName:
                        item.registration?.courseOffering?.term?.semester ||
                        'N/A',

                    year: item.registration?.courseOffering?.term?.year || 0,

                    attendanceScore: item.attendanceScore,
                    midtermScore: item.midtermScore,
                    finalScore: item.finalScore,
                    totalScore: item.totalScore,
                    letterGrade: item.letterGrade,
                    isPassed: item.isPassed,
                    isPublished: item.isPublished,
                };
            }),

            curriculumSubjects: curriculumSubjects.map((item) => ({
                subjectId: item.subject?.id,
                subjectName: item.subject?.name,
                subjectCode: item.subject?.code,
                credit: item.subject?.credit || 0,
                isPassed: item.subject?.id
                    ? passedSubjectIds.has(item.subject.id)
                    : false,
            })),
        };
    }
}
