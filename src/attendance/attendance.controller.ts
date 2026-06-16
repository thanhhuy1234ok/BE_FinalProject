import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    ParseIntPipe,
    Req,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { User } from '@/helpers/decorator/customize';
import {
    BulkAttendanceDto,
    GenerateAttendanceQRDto,
    MarkAttendanceDto,
    ScanAttendanceQRDto,
} from './dto/create-attendance.dto';
import type { IUser } from '@/helpers/types/user.interface';

@Controller('attendance')
export class AttendanceController {
    constructor(private readonly attendanceService: AttendanceService) {}

    @Post('teacher/:lessonId/attendance/manual')
    markManualAttendance(
        @User() req: IUser,
        @Param('lessonId', ParseIntPipe) lessonId: number,
        @Body() dto: MarkAttendanceDto,
    ) {
        return this.attendanceService.markManualAttendance(
            req.id,
            lessonId,
            dto,
        );
    }

    @Post('teacher/:lessonId/attendance/bulk')
    bulkAttendance(
        @User() req: IUser,
        @Param('lessonId', ParseIntPipe) lessonId: number,
        @Body() dto: BulkAttendanceDto,
    ) {
        return this.attendanceService.bulkAttendance(req.id, lessonId, dto);
    }

    /*
    =========================================================
    TEACHER CREATE QR
    =========================================================
    */

    @Post('lessons/:lessonId/qr')
    generateQR(
        @Param('lessonId', ParseIntPipe) lessonId: number,
        @Req() req: any,
        @Body() dto: GenerateAttendanceQRDto,
    ) {
        return this.attendanceService.generateAttendanceQR(
            lessonId,
            req.user.id,
            dto,
        );
    }

    /*
    =========================================================
    STUDENT SCAN QR
    =========================================================
    */

    // @Post('scan')
    // scanQR(@Body('token') token: string, @User() req: IUser) {
    //     return this.attendanceService.scanAttendanceQR(req.id, token);
    // }

    @Post('scan-qr')
    scanQR(@Req() req: any, @Body() dto: ScanAttendanceQRDto) {
        return this.attendanceService.scanAttendanceQR(req.user.id, dto);
    }
}
