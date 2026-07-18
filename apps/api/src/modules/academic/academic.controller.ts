import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { Role } from "../../../generated/phase5-client";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AcademicService } from "./academic.service";
import {
  AssignmentDto,
  BatchDto,
  BulkStudentsDto,
  CourseDto,
  DepartmentDto,
  FacultyDto,
  ListQueryDto,
  ResetPasswordDto,
  SemesterDto,
  StudentDto,
  SubjectDto,
  UpdateEntityStatusDto,
} from "./dto/academic.dto";

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN)
export class AcademicBaseController {
  constructor(
    @Inject(AcademicService) protected readonly academic: AcademicService,
  ) {}
}

@ApiTags("academic")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN)
@Controller("api/v1/academic")
export class AcademicController extends AcademicBaseController {
  @Get("stats")
  @ApiOperation({ summary: "Return tenant-scoped academic dashboard counts." })
  @ApiOkResponse({ description: "Academic counts returned." })
  dashboard(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListQueryDto,
  ) {
    return this.academic.dashboard(user, query);
  }
}

@ApiTags("departments")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN)
@Controller("api/v1/departments")
export class DepartmentsController extends AcademicBaseController {
  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListQueryDto) {
    return this.academic.listDepartments(user, query);
  }

  @Post()
  @ApiCreatedResponse({ description: "Department created." })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: DepartmentDto) {
    return this.academic.createDepartment(user, dto);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.academic.getDepartment(user, id);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: DepartmentDto,
  ) {
    return this.academic.updateDepartment(user, id, dto);
  }

  @Delete(":id")
  @HttpCode(200)
  archive(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.academic.deleteDepartment(user, id);
  }
}

@ApiTags("courses")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN)
@Controller("api/v1/courses")
export class CoursesController extends AcademicBaseController {
  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListQueryDto) {
    return this.academic.listCourses(user, query);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CourseDto) {
    return this.academic.createCourse(user, dto);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.academic.getCourse(user, id);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: CourseDto,
  ) {
    return this.academic.updateCourse(user, id, dto);
  }

  @Delete(":id")
  @HttpCode(200)
  archive(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.academic.deleteCourse(user, id);
  }
}

@ApiTags("semesters")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN)
@Controller("api/v1/semesters")
export class SemestersController extends AcademicBaseController {
  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListQueryDto) {
    return this.academic.listSemesters(user, query);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: SemesterDto,
  ) {
    return this.academic.updateSemester(user, id, dto);
  }
}

@ApiTags("subjects")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN)
@Controller("api/v1/subjects")
export class SubjectsController extends AcademicBaseController {
  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListQueryDto) {
    return this.academic.listSubjects(user, query);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: SubjectDto) {
    return this.academic.createSubject(user, dto);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: SubjectDto,
  ) {
    return this.academic.updateSubject(user, id, dto);
  }

  @Delete(":id")
  @HttpCode(200)
  archive(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.academic.deleteSubject(user, id);
  }
}

@ApiTags("batches")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN)
@Controller("api/v1/batches")
export class BatchesController extends AcademicBaseController {
  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListQueryDto) {
    return this.academic.listBatches(user, query);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: BatchDto) {
    return this.academic.createBatch(user, dto);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: BatchDto,
  ) {
    return this.academic.updateBatch(user, id, dto);
  }

  @Delete(":id")
  @HttpCode(200)
  archive(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.academic.deleteBatch(user, id);
  }
}

@ApiTags("faculty")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN)
@Controller("api/v1/faculty")
export class FacultyController extends AcademicBaseController {
  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListQueryDto) {
    return this.academic.listFaculty(user, query);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: FacultyDto) {
    return this.academic.createFaculty(user, dto);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: FacultyDto,
  ) {
    return this.academic.updateFaculty(user, id, dto);
  }

  @Patch(":id/status")
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateEntityStatusDto,
  ) {
    return this.academic.setFacultyStatus(user, id, dto.status);
  }

  @Post(":id/reset-password")
  resetPassword(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.academic.resetFacultyPassword(user, id, dto);
  }
}

@ApiTags("students")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN)
@Controller("api/v1/students")
export class StudentsController extends AcademicBaseController {
  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListQueryDto) {
    return this.academic.listStudents(user, query);
  }

  @Get("template")
  template() {
    return this.academic.studentTemplate();
  }

  @Get("export")
  export(@CurrentUser() user: AuthenticatedUser, @Query() query: ListQueryDto) {
    return this.academic.exportStudents(user, query);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: StudentDto) {
    return this.academic.createStudent(user, dto);
  }

  @Post("bulk")
  bulkCreate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BulkStudentsDto,
  ) {
    return this.academic.bulkCreateStudents(user, dto);
  }

  @Post("import")
  import(@CurrentUser() user: AuthenticatedUser, @Body() dto: BulkStudentsDto) {
    return this.academic.bulkCreateStudents(user, dto);
  }

  @Patch("bulk")
  bulkUpdate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BulkStudentsDto,
  ) {
    return this.academic.bulkUpdateStudents(user, dto);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: StudentDto,
  ) {
    return this.academic.updateStudent(user, id, dto);
  }

  @Patch(":id/status")
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateEntityStatusDto,
  ) {
    return this.academic.setStudentStatus(user, id, dto.status);
  }

  @Post(":id/reset-password")
  resetPassword(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.academic.resetStudentPassword(user, id, dto);
  }
}

@ApiTags("assignments")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN)
@Controller("api/v1/assignments")
export class AssignmentsController extends AcademicBaseController {
  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListQueryDto) {
    return this.academic.listAssignments(user, query);
  }

  @Post()
  assign(@CurrentUser() user: AuthenticatedUser, @Body() dto: AssignmentDto) {
    return this.academic.assignSubject(user, dto);
  }

  @Delete(":id")
  @HttpCode(200)
  archive(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.academic.deleteAssignment(user, id);
  }
}
