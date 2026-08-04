import { Controller, Get } from "@nestjs/common";

// Deliberately duplicated from services/progress rather than imported: a
// liveness probe is 3 lines, and a shared health controller would be a
// services/* -> services/* import for no benefit.
@Controller("health")
export class HealthController {
  @Get()
  check() {
    return { status: "ok" };
  }
}
