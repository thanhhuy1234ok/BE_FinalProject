import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { CreateUserDto, ImportStudentExcelDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { DataSource, EntityManager, Not, Repository } from 'typeorm';
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
import { AdminClassStatus } from '@/helpers/enum/enum.global';

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

        @InjectRepository(AdminClass)
        private readonly classRepo: Repository<AdminClass>,

        @InjectRepository(Department)
        private departmentRepo: Repository<Department>,
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

        const finalWhere = {
            ...where,
            role: {
                ...(where as any)?.role,
                name: Not(ADMIN_ROLE),
            },
        };

        const totalItems = await this.usersRepository.count({
            where: finalWhere,
            withDeleted: true,
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
}
