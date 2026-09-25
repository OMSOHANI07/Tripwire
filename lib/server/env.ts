// Loads .env.local for standalone scripts (Next.js does this itself).
export function loadLocalEnv() {
  for (const f of [".env.local", ".env"]) {
    try {
      process.loadEnvFile(f);
    } catch {
      // file missing: fine
    }
  }
}
