import { Test } from "@nestjs/testing";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtAuthGuard } from "./jwt.guard";

/**
 * Boots the guard through real Nest dependency injection.
 *
 * The plain unit tests construct JwtAuthGuard directly, so they cannot see DI
 * problems. When the JWKS key-set factory was added as a second constructor
 * parameter without @Optional(), Nest tried to resolve it as a provider and
 * failed ("can't resolve dependencies ... argument Function at index [1]"),
 * taking down module initialisation so every route returned 500 - while every
 * unit test still passed. This test closes that gap.
 */
describe("JwtAuthGuard dependency injection", () => {
  it("resolves from the Nest container with only ConfigService available", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ ignoreEnvFile: true })],
      providers: [JwtAuthGuard],
    }).compile();

    const guard = moduleRef.get(JwtAuthGuard);
    expect(guard).toBeInstanceOf(JwtAuthGuard);
    // The optional factory parameter must fall back to its default, not be
    // injected as undefined-and-broken.
    expect((guard as any).keySetFactory).toBeInstanceOf(Function);
    expect(moduleRef.get(ConfigService)).toBeDefined();

    await moduleRef.close();
  });
});
