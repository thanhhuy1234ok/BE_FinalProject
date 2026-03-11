import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Not, Repository } from 'typeorm';
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
            ...rest
        } = createUserDto;

        // 1. Hash password
        const hashPassword = await getHashPassword(password);

        // 2. Check email tồn tại
        const checkEmail = await this.usersRepository.findOne({
            where: { email: createUserDto.email },
        });
        if (checkEmail) {
            throw new BadRequestException('Email already exists');
        }

        // 3. Check role
        const checkRoles = await this.rolesRepository.findOne({
            where: { id: role },
        });
        if (!checkRoles) {
            throw new BadRequestException('Role not found');
        }

        // 4. Validate phone
        if (phone) {
            const isValidPhoneUser = isValidPhone(phone);
            if (!isValidPhoneUser) {
                throw new BadRequestException('Phone number is not valid');
            }
            const checkPhone = await this.usersRepository.findOne({
                where: { phone },
            });
            if (checkPhone) {
                throw new BadRequestException('Phone number already exists');
            }
        }

        // 5. Tạo user
        const user = this.usersRepository.create({
            ...rest,
            role_id: checkRoles.id,
            password: hashPassword,
            phone,
            createdAt: new Date(),
        });

        // ADMIN → chỉ cần user, không tạo student
        if (checkRoles.name === ADMIN_ROLE) {
            return await this.usersRepository.save(user);
        }

        // STUDENT → cần tạo thêm student
        if (checkRoles.name === STUDENT_ROLE) {
            if (!major_id || !yearOfAdmissionId) {
                throw new BadRequestException(
                    'Missing student information: class_id, major_id, or yearOfAdmissionId',
                );
            }

            const [major, classEntity, admissionYear] = await Promise.all([
                this.majorRepo.findOne({ where: { id: major_id } }),
                this.classRepo.findOne({ where: { id: class_id } }),
                this.yearOfAdmissionRepo.findOne({
                    where: { id: yearOfAdmissionId },
                }),
            ]);

            if (!major) throw new BadRequestException('Major not found');
            // if (!classEntity) throw new BadRequestException('Class not found');
            if (!admissionYear)
                throw new BadRequestException('AdmissionYear not found');

            const saveUser = await this.usersRepository.save(user);

            const mssv = await this.generateMssv(admissionYear);

            const student = this.studentRepo.create({
                user_id: saveUser.id, // ✅ LINK ĐÚNG USER
                mssv,
                major_id,
                adminClassId: classEntity?.id,
                yearOfAdmissionId: admissionYear.id,
            });

            return await this.studentRepo.save(student);
        }

        // TEACHER → cần tạo thêm teacher
        if (checkRoles.name === TEACHER_ROLE) {
            const saveUser = await this.usersRepository.save(user);
            const department = await this.departmentRepo.findOne({
                where: { id: departmentId },
            });
            if (!department) {
                throw new BadRequestException('Department not found');
            }
            const count = await this.teacherRepo.count();
            const msgv = `GV${String(count + 1).padStart(5, '0')}`;
            const teacher = this.teacherRepo.create({
                user_id: saveUser.id,
                specialization: createUserDto.specialization,
                degree: createUserDto.degree,
                msgv,
                department_id: departmentId,
            });
            return await this.teacherRepo.save(teacher);
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
        const totalItems = await this.usersRepository.count({
            where,
            withDeleted: true,
        });

        const totalPages = Math.ceil(totalItems / pageLimit);

        const result = await this.usersRepository.find({
            where: {
                ...where,
                role: { name: Not(ADMIN_ROLE) },
            },
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
                teacher: true,
            },
            select: {
                role: {
                    name: true,
                },
                student: {
                    mssv: true,
                    major: { name: true },
                    yearOfAdmission: { year: true },
                    adminClass: { name: true },
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
                student: true,
                teacher: true,
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

    // async createManyUser(createManyUserDto: CreateManyUserDto[]) {
    //     const roleStudent = await this.rolesRepository.findOne({
    //         where: { name: 'STUDENT' },
    //     });
    //     const roleName = createManyUserDto.map((dto) =>
    //         dto.role ? dto.role : roleStudent.name,
    //     );

    //     const roles = await this.rolesRepository.find({
    //         where: {
    //             name: In(roleName),
    //         },
    //     });

    //     const roleMap = new Map(roles.map((role) => [role.name, role]));

    //     const majorIds = createManyUserDto.map((dto) => dto.major);
    //     const majors = await this.majorRepository.find({
    //         where: {
    //             code: In(majorIds),
    //         },
    //     });

    //     const majorMap = new Map(majors.map((major) => [major.code, major]));

    //     const classCodes = createManyUserDto.map((dto) => dto.class);
    //     const classes = await this.classRepository.find({
    //         where: {
    //             name: In(classCodes), // Tìm lớp qua mã
    //         },
    //     });

    //     const classMap = new Map(
    //         classes.map((classEntity) => [classEntity.name, classEntity]),
    //     );

    //     const cohortCodes = createManyUserDto.map((dto) => dto.yearOfAdmission);
    //     const cohorts = await this.cohortRepository.find({
    //         where: {
    //             startYear: In(cohortCodes),
    //         },
    //     });

    //     // Ánh xạ mã Cohort -> đối tượng Cohort
    //     const cohortMap = new Map(
    //         cohorts.map((cohort) => [cohort.startYear, cohort]),
    //     );

    //     console.log(cohortCodes);

    //     let countSuccess = 0;
    //     let countError = 0;

    //     const users = await Promise.all(
    //         createManyUserDto.map(async (dto) => {
    //             try {
    //                 const existingUser = await this.usersRepository.findOne({
    //                     where: { email: dto.email },
    //                 });
    //                 if (existingUser) {
    //                     throw new BadRequestException(
    //                         `Email ${dto.email} đã tồn tại`,
    //                     );
    //                 }

    //                 const role = roleMap.get(
    //                     dto.role ? dto.role : roleStudent.name,
    //                 );
    //                 if (!role) {
    //                     throw new BadRequestException(
    //                         `Không tìm thấy vai trò với tên "${dto.role || roleStudent.name}"`,
    //                     );
    //                 }

    //                 const major = majorMap.get(dto.major);
    //                 if (!major) {
    //                     throw new BadRequestException(
    //                         `Không tìm thấy ngành học với mã "${dto.major}"`,
    //                     );
    //                 }

    //                 const cohort = cohortMap.get(dto.yearOfAdmission);
    //                 if (!cohort) {
    //                     throw new Error(
    //                         `Không tìm thấy Cohort với mã "${dto.yearOfAdmission}"`,
    //                     );
    //                 }

    //                 const classEntity = classMap.get(dto.class);
    //                 if (!classEntity) {
    //                     throw new BadRequestException(
    //                         `Không tìm thấy lớp học với mã "${dto.class}"`,
    //                     );
    //                 }

    //                 const currentCount = await this.usersRepository.count({
    //                     where: { class: { id: classEntity.id } },
    //                 });

    //                 if (currentCount >= classEntity.maxCapacity) {
    //                     throw new BadRequestException(
    //                         `Lớp học "${dto.class}" đã đạt đến giới hạn (${classEntity.maxCapacity})`,
    //                     );
    //                 }

    //                 const hashPassword = dto.password
    //                     ? await getHashPassword(dto.password)
    //                     : await getHashPassword('123456');

    //                 const user = this.usersRepository.create({
    //                     name: dto.name,
    //                     email: dto.email,
    //                     password: hashPassword,
    //                     role: role,
    //                     major: major,
    //                     class: classEntity,
    //                     yearOfAdmission: cohort,
    //                 });

    //                 countSuccess++;
    //                 return user;
    //             } catch (error) {
    //                 console.error(`Lỗi khi tạo user: ${error.message}`);
    //                 countError++;
    //                 return null;
    //             }
    //         }),
    //     );

    //     const validUsers = users.filter((user) => user !== null);
    //     const data = await this.usersRepository.save(validUsers);

    //     return {
    //         countSuccess: countSuccess,
    //         countError: countError,
    //         data: data,
    //     };
    // }
}
