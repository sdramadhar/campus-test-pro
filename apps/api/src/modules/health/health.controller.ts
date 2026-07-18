import { Controller, Get, Inject } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { HealthService, ReadinessResponse } from "./health.service";

@ApiTags("health")
@Controller()
export class HealthController {
  constructor(
    @Inject(HealthService) private readonly healthService: HealthService,
  ) {}

  @Get("health")
  @ApiOkResponse({ description: "API process health status." })
  health(): { status: "ok"; service: string; timestamp: string } {
    return {
      status: "ok",
      service: "campustest-api",
      timestamp: new Date().toISOString(),
    };
  }

  @Get("ready")
  @ApiOkResponse({ description: "Dependency readiness status." })
  async ready(): Promise<ReadinessResponse> {
    return this.healthService.ready();
  }
}
