import bcrypt from "bcryptjs";
import { Document, Model, Schema, model } from "mongoose";

export const USER_ROLES = [
  "admin",
  "mine_manager",
  "safety_officer",
  "corporate_officer",
  "regulator",
  "worker",
  "inspector",
  "contractor"
] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  comparePassword(password: string): Promise<boolean>;
}

interface UserModel extends Model<IUser> {
  hashPassword(password: string): Promise<string>;
}

const userSchema = new Schema<IUser, UserModel>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, default: "worker", required: true }
  },
  { timestamps: true }
);

userSchema.statics.hashPassword = (password: string) => bcrypt.hash(password, 12);
userSchema.methods.comparePassword = function comparePassword(password: string) {
  return bcrypt.compare(password, this.passwordHash);
};

export const User = model<IUser, UserModel>("User", userSchema);