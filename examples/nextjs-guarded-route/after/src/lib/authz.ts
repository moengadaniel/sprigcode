export async function requireAdmin(request: Request) {
  const role = request.headers.get("x-user-role");
  if (role !== "admin") {
    throw new Response("Forbidden", { status: 403 });
  }
}
