/**
 * resetDb — truncates all tables and re-seeds via POST /api/test/reset.
 * Call in beforeEach to guarantee a clean slate for every test.
 */
export async function resetDb(baseUrl: string): Promise<void> {
  const password = process.env.E2E_ADMIN_PASSWORD ?? "testpassword";
  const res = await fetch(`${baseUrl}/api/test/reset`, {
    method: "POST",
    headers: { Authorization: `Bearer ${password}` },
  });
  if (res.status !== 204) {
    throw new Error(`resetDb failed: ${res.status} ${await res.text()}`);
  }
}
