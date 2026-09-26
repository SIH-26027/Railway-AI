export type Department = 'Engineering' | 'Traction Distribution (TRD)' | 'Signal & Telecommunication (S&T)';
export type DepartmentShort = 'Engineering' | 'TRD' | 'S&T';
export type SourceSystem = 'TMS' | 'TDMS' | 'SMMS';

export type Priority = 'High' | 'Medium' | 'Low';
export type Urgency = 'Urgent' | 'Normal' | 'Routine';
export type OperationalImpact = 'High' | 'Medium' | 'Low';

export type RequestStatus = 
  | 'Pending Planning'
  | 'Under Planning'
  | 'Planned'
  | 'Approved'
  | 'Rejected'
  | 'Completed';

export interface MaintenanceRequest {
  id: string; // e.g. BR-2026-001
  department: Department;
  departmentShort: DepartmentShort;
  sourceSystem: SourceSystem;
  corridor: string;
  blockSection: string;
  line: 'UP Line' | 'DN Line' | 'Single Line' | 'Both Lines';
  fromKm: number;
  toKm: number;
  asset: string;
  assetType: string;
  maintenanceType: string;
  defectReason: string;
  description: string;
  requestedDate: string;
  estimatedDurationMin: number;
  priority: Priority;
  urgency: Urgency;
  operationalImpact: OperationalImpact;
  status: RequestStatus;
  requestedBy: string;
  submittedDate: string;
  
  // Operational Requirements
  blockRequired: 'Absolute' | 'Shadow' | 'Caution' | 'Power Block';
  disconnectionRequired: boolean;
  disconnectionType?: string;
  safetyRequirements: string[];
  resourcesRequired: string[];
  
  // Planning & Notes
  candidateWindowsCount?: number;
  aiPriorityScore?: number;
  planningNotes?: string;
}

export interface CandidateWindow {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMin: number;
  trainImpact: 'Low' | 'Moderate' | 'High';
  resourceAvailability: 'Available' | 'Constrained' | 'Unavailable';
  suitability: 'Highly Suitable' | 'Suitable' | 'Marginal';
  conflicts: string[];
  isRecommended?: boolean;
}

export interface OperationalRuleCheck {
  corridorAvailable: boolean;
  noOverlappingBlock: boolean;
  trainConflictChecked: boolean;
  durationValid: boolean;
  resourceAvailable: boolean;
  safetyBufferSatisfied: boolean;
  assetSectionMatch: boolean;
  requestNotPlanned: boolean;
  tractionDisconnectionValid: boolean;
  details?: {
    conflictDescription?: string;
    affectedTrains?: string[];
  };
}

export interface AIPlanningPlan {
  planId: string; // e.g. PLAN-2026-031
  requestId: string;
  requestIds?: string[];
  department: Department;
  departments?: Department[];
  departmentShort: DepartmentShort;
  departmentShorts?: DepartmentShort[];
  corridor: string;
  corridorId?: string;
  blockSection: string;
  line: string;
  asset: string;
  maintenanceType: string;
  recommendedDate: string;
  startTime: string;
  endTime: string;
  durationMin: number;
  aiPriorityScore: number; // e.g. 92/100
  priorityBreakdown: {
    criticality: number; // 0 - 100
    urgency: number;
    assetImpact: number;
    trainImpact: number;
    resourceReady: number;
  };
  trainImpact: 'Low' | 'Moderate' | 'High';
  resourceAvailability: 'Available' | 'Constrained' | 'Unavailable';
  conflictStatus: 'No Conflict' | 'Clear' | 'Train Conflict' | 'Power Disconnection Needed' | 'Overlapping Request';
  recommendation: 'Recommended' | 'Alternative' | 'Under Review';
  status: 'AI Recommended' | 'Approved' | 'Modified – Pending Approval' | 'Rejected' | 'COA Approval Required';
  finalStatus?: 'PLANNED' | 'COMBINED_BLOCK' | 'SPLIT_PLAN' | 'EXISTING_BLOCK_ABSORBED' | 'COA_APPROVAL_REQUIRED' | 'NO_FEASIBLE_PLAN';
  operationalRegulationRequired?: boolean;
  approvalAuthority?: string;
  highPriorityAffectedTrains?: string[];
  affectedTrains?: string[];
  gapDuration?: number;
  gapUtilization?: number;
  coordinationOpportunity?: {
    isCoordinated: boolean;
    leadDepartment: DepartmentShort;
    partnerDepartments: DepartmentShort[];
    sharedWindow: string;
    description: string;
  };
  reasoningFactors: string[];
  candidateWindows: CandidateWindow[];
  ruleValidation: OperationalRuleCheck;
  coaRemarks?: string;
}

export type ExistingBlockStatus = 
  | 'Scheduled'
  | 'Active'
  | 'Completed'
  | 'Cancelled'
  | 'Modified';

export interface ExistingBlock {
  blockId: string; // e.g. BLK-2026-011
  corridor: string;
  blockSection: string;
  line: 'UP Line' | 'DN Line' | 'Both Lines' | 'Single Line';
  department: Department;
  departmentShort: DepartmentShort;
  purpose: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMin: number;
  status: ExistingBlockStatus;
  source: string; // 'COA Schedule' | 'Divisional Emergency'
  approvedBy: string;
  approvalDate: string;
  trainMovementsAffected: string[];
  adjacentLineStatus: string;
  resourcesAssigned: string[];
  safetyRequirements: string[];
  disconnectionRequirements: string;
  modificationHistory?: {
    modifiedAt: string;
    modifiedBy: string;
    remarks: string;
  }[];
}

export interface CorridorSection {
  id: string;
  corridor: string;
  section: string;
  fromStation: string;
  toStation: string;
  line: 'UP Line' | 'DN Line' | 'Single Line' | 'Double Line';
  distanceKm: number;
  currentAvailability: 'Available' | 'Blocked' | 'Restricted Speed';
  activeBlock: string | null;
  upcomingBlock: string | null;
  trainDensity: 'Low Traffic' | 'Moderate Traffic' | 'High Traffic' | 'Peak Traffic';
  status: 'Operational' | 'Caution Order' | 'Under Maintenance';
  maxSpeedKmph: number;
  fromStationCode?: string;
  toStationCode?: string;
}

export interface TrainSchedule {
  trainNumber: string;
  trainName: string;
  type: 'Superfast' | 'Express' | 'Passenger' | 'Goods (Freight)' | 'Vande Bharat';
  route: string;
  corridor: string;
  arrival: string;
  departure: string;
  priority: 'Highest' | 'High' | 'Medium' | 'Low';
  daysOfRun: string;
  rakeType?: string;
}

export interface ResourceItem {
  id: string;
  department: Department;
  departmentShort: DepartmentShort;
  team: string;
  equipment: string;
  machinery: string;
  vehicle: string;
  availability: 'Available' | 'Assigned' | 'Unavailable' | 'Maintenance';
  assignedBlock: string | null;
  baseStation: string;
  crewStrength: number;
}

export interface PlanningRunHistory {
  runId: string;
  date: string;
  planningHorizon: 'Today' | 'This Week' | 'This Month';
  requestsProcessed: number;
  candidateWindows: number;
  validWindows: number;
  conflictingWindowsRemoved: number;
  recommendedPlans: number;
  approvedPlans: number;
  rejectedPlans: number;
  conflictsDetected: number;
  estimatedDowntimeHours: number;
  optimizedDowntimeHours: number;
  coordinationOpportunities: number;
  createdAt: string;
  executedBy: string;
}
