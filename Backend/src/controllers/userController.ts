import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { User, USER_ROLES } from "../models/User";

export async function listUsers(request: AuthenticatedRequest, response: Response): Promise<void> {
  const role = typeof request.query.role === "string" && USER_ROLES.includes(request.query.role as never) ? request.query.role : undefined;
  const users = await User.find(role ? { role } : {}).select("name email role").sort({ name: 1 }).lean();
  response.json(users.map((user) => ({ id: String(user._id), name: user.name, email: user.email, role: user.role })));
}