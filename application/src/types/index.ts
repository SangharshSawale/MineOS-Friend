export type UserRole =
  | 'admin'
  | 'mine_manager'
  | 'safety_officer'
  | 'corporate_officer'
  | 'regulator'
  | 'worker'
  | 'inspector'
  | 'contractor'
  | 'viewer';

/** Display labels shown in the registration role picker. */
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Mine {
  _id: string;
  name: string;
  code: string;
  location: string;
  operator: string;
  status: 'active' | 'inactive';
  createdBy: string;
  createdAt?: string;
  updatedAt?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  attendanceRadius?: number;
}

export interface CreateMinePayload {
  name: string;
  code: string;
  location: string;
  operator: string;
}

export interface UpdateMinePayload {
  name?: string;
  code?: string;
  location?: string;
  operator?: string;
  status?: 'active' | 'inactive';
}

export type InspectionType =
  | 'routine_safety_audit'
  | 'ventilation'
  | 'ppe_compliance'
  | 'dust_monitoring'
  | 'equipment_safety'
  | 'emergency_exits';

export type ComplianceStatus = 'pass' | 'fail' | 'partial';

export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ChecklistItemId = 'ppe_compliance' | 'emergency_exits' | 'fire_extinguisher';

export interface GpsCoordinates {
  latitude: number;
  longitude: number;
  timestamp: string;
  /** Horizontal accuracy reported by the device, when available. */
  accuracyMeters?: number;
}

/** Unified geo-tagged image: photo URI bundled with capture-time GPS metadata. */
export interface GeoTaggedImage {
  uri: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  accuracyMeters?: number;
}

export interface ViolationEvidence {
  observationNotes: string;
  severity: SeverityLevel;
  geoTaggedImage?: GeoTaggedImage;
}

export interface ChecklistItemResult {
  id: ChecklistItemId;
  label: string;
  description: string;
  status: ComplianceStatus;
  violation?: ViolationEvidence;
}

export interface InspectionRecord {
  id: string;
  mineId: string;
  mineName: string;
  mineLocation: string;
  inspectorId: string;
  inspectorName: string;
  inspectionType: InspectionType;
  checklistItems: ChecklistItemResult[];
  /** GPS captured when the inspection is submitted. */
  gps: GpsCoordinates;
  submittedAt: string;
}

export interface HazardReport {
  id: string;
  description: string;
  geoTaggedImage?: GeoTaggedImage;
  gps: GpsCoordinates;
  reporterId: string;
  reporterName: string;
  submittedAt: string;
}

export interface InspectionFormData {
  type: InspectionType;
  status: ComplianceStatus;
  observations: string;
  inspectorName: string;
  mineId: string;
  mineName: string;
  submittedAt: string;
}

// === Feature 1: Assigned Action ===
export type TaskStatus = 'Pending' | 'In Progress' | 'Completed' | 'Overdue';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface AssignedAction {
  _id: string;
  userId?: string;
  mineId?: {
    _id: string;
    name: string;
    code: string;
    location: string;
  } | string;
  complianceId?: {
    _id: string;
    requirement: string;
    category: string;
    dueDate: string;
    expiry: string;
    status: string;
  } | string;
  title: string;
  category: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  notes?: string;
  assignedAt?: string;
  done: boolean;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

// === Feature 2: Offline sync state ===
export type SyncStatus = 'synced' | 'offline' | 'pending' | 'syncing' | 'failed';

export interface SyncQueueItem {
  id: string;
  taskId: string;
  action: 'updateStatus';
  payload: { status: TaskStatus; notes?: string };
  createdAt: string;
  retryCount: number;
}

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  MainTabs: undefined;
};

export type MainTabParamList = {
  HomeTab: undefined;
  Reels: undefined;
  Messages: undefined;
  ProfileTab: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  AddMine: undefined;
};

/** Legacy internal flow types retained for the existing inspection components. */
export type InspectionStackParamList = {
  SelectMine: undefined;
  StartInspection: undefined;
};

export type HazardStackParamList = {
  HazardReport: undefined;
};

export type MessagesStackParamList = {
  AssignedActions: undefined;
  TaskDetail: { task: AssignedAction };
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  AttendanceCheckIn: undefined;
};
