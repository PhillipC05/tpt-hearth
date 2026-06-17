import { beforeAll, afterAll } from "vitest";

// Configure isolated test database path
process.env.DATABASE_URL = "file:.data/test-hearth.sqlite";
process.env.DATABASE_PATH = ".data/test-hearth.sqlite";
process.env.DEMO_AUTH_ALLOWED = "true";
process.env.AUTH_MODE = "local_demo";