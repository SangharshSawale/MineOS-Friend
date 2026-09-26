import { Document, Schema, model } from "mongoose";

export interface IProductionLog extends Document {
  mineId: Schema.Types.ObjectId;
  date: Date;
  shift: "shift_a" | "shift_b" | "shift_c";
  pitOrSeam: string;
  coalGrade: string;
  targetTonnage: number;
  achievedTonnage: number;
  overburdenM3: number;
  equipmentDeployed: string;
  status: "On Target" | "Normal" | "Delayed";
  recordedBy: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const productionLogSchema = new Schema<IProductionLog>(
  {
    mineId: { type: Schema.Types.ObjectId, ref: "Mine", required: true, index: true },
    date: { type: Date, required: true, default: Date.now, index: true },
    shift: { type: String, enum: ["shift_a", "shift_b", "shift_c"], default: "shift_a" },
    pitOrSeam: { type: String, required: true, trim: true },
    coalGrade: { type: String, required: true, trim: true },
    targetTonnage: { type: Number, required: true, min: 0 },
    achievedTonnage: { type: Number, required: true, min: 0 },
    overburdenM3: { type: Number, default: 0, min: 0 },
    equipmentDeployed: { type: String, trim: true },
    status: { type: String, enum: ["On Target", "Normal", "Delayed"], default: "Normal" },
    recordedBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

export const ProductionLog = model<IProductionLog>("ProductionLog", productionLogSchema);
