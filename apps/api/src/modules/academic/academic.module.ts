import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import {
  AcademicController,
  AssignmentsController,
  BatchesController,
  CoursesController,
  DepartmentsController,
  FacultyController,
  SemestersController,
  StudentsController,
  SubjectsController,
} from "./academic.controller";
import { AcademicService } from "./academic.service";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [
    AcademicController,
    AssignmentsController,
    BatchesController,
    CoursesController,
    DepartmentsController,
    FacultyController,
    SemestersController,
    StudentsController,
    SubjectsController,
  ],
  providers: [AcademicService],
})
export class AcademicModule {}
