import { Document, Schema, model } from "mongoose";

export const TASK_STATUSES = ["Pending", "In Progress", "Completed", "Overdue"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["Low", "Medium", "High", "Critical"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export interface IWorkerTask extends Document {
  workerId?: Schema.Types.ObjectId;
  userId?: Schema.Types.ObjectId;
  mineId?: Schema.Types.ObjectId;
  complianceId?: Schema.Types.ObjectId;
  title: string;
  category: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date;
  notes?: string;
  assignedAt?: Date;
  done: boolean;
  time: string;
  date: string;
  completedAt?: Date;
}

const workerTaskSchema = new Schema<IWorkerTask>(
  {
    workerId: { type: Schema.Types.ObjectId, ref: "Worker" },
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    mineId: { type: Schema.Types.ObjectId, ref: "Mine" },
    complianceId: { type: Schema.Types.ObjectId, ref: "Compliance" },
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    status: { type: String, enum: TASK_STATUSES, default: "Pending" },
    priority: { type: String, enum: TASK_PRIORITIES, default: "Medium" },
    dueDate: { type: Date },
    notes: { type: String, trim: true, maxlength: 5000 },
    assignedAt: { type: Date },
    done: { type: Boolean, default: false },
    time: { type: String, default: "Pending" },
    date: { type: String, default: () => new Date().toISOString().slice(0, 10) },
    completedAt: { type: Date }
  },
  { timestamps: true }
);

export const WorkerTask = model<IWorkerTask>("WorkerTask", workerTaskSchema);
