import { Document, Schema, model } from "mongoose";

export interface IEnvironmentLog extends Document {
  mineId: Schema.Types.ObjectId;
  stationName: string;
  stationType: "air_quality" | "dust_suppression" | "water_effluent" | "groundwater";
  aqi: number;
  pm10: number;
  pm25: number;
  so2: number;
  waterPh: number;
  tssMgL: number;
  oilAndGreaseMgL: number;
  mistCannonsActivePercent: number;
  readingDetails: string;
  status: "Normal" | "Elevated" | "Critical";
  complianceStatus: string;
  recordedAt: Date;
  createdAt: Date;
}

const environmentLogSchema = new Schema<IEnvironmentLog>(
  {
    mineId: { type: Schema.Types.ObjectId, ref: "Mine", required: true, index: true },
    stationName: { type: String, required: true, trim: true },
    stationType: {
      type: String,
      enum: ["air_quality", "dust_suppression", "water_effluent", "groundwater"],
      required: true,
      index: true
    },
    aqi: { type: Number, default: 100 },
    pm10: { type: Number, default: 70 },
    pm25: { type: Number, default: 35 },
    so2: { type: Number, default: 12 },
    waterPh: { type: Number, default: 7.2 },
    tssMgL: { type: Number, default: 20 },
    oilAndGreaseMgL: { type: Number, default: 1.5 },
    mistCannonsActivePercent: { type: Number, default: 98 },
    readingDetails: { type: String, trim: true },
    status: { type: String, enum: ["Normal", "Elevated", "Critical"], default: "Normal" },
    complianceStatus: { type: String, default: "Compliant" },
    recordedAt: { type: Date, default: Date.now, index: true }
  },
  { timestamps: true }
);

export const EnvironmentLog = model<IEnvironmentLog>("EnvironmentLog", environmentLogSchema);
