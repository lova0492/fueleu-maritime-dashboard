import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface PoolRecord {
    members: Array<PoolMember>;
    valid: boolean;
    timestamp: bigint;
    poolSum: number;
    poolId: string;
}
export interface ComplianceResult {
    energyInScope: number;
    isCompliant: boolean;
    complianceBalance: number;
}
export interface PoolMember {
    cb_after: number;
    cb_before: number;
    routeId: string;
}
export interface BankEntry {
    year: bigint;
    usedAmount: number;
    routeId: string;
    bankedAmount: number;
}
export interface Route {
    vesselType: string;
    year: bigint;
    fuelConsumption: number;
    distance: number;
    isBaseline: boolean;
    routeId: string;
    fuelType: string;
    ghgIntensity: number;
    totalEmissions: number;
}
export interface backendInterface {
    applyBankedSurplus(routeId: string, amount: number): Promise<void>;
    bankSurplus(routeId: string): Promise<void>;
    createPool(routeIds: Array<string>): Promise<void>;
    getAllBankEntries(): Promise<Array<BankEntry>>;
    getBankEntry(routeId: string): Promise<BankEntry | null>;
    getBaseline(): Promise<Route | null>;
    getComplianceBalance(routeId: string): Promise<ComplianceResult>;
    getPools(): Promise<Array<PoolRecord>>;
    getRoutes(): Promise<Array<Route>>;
    init(): Promise<void>;
    setBaseline(routeId: string): Promise<void>;
}
