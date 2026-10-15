import { z } from 'zod';
import { id, date } from './contracts';

export const assignedLocationSchema = z
  .object({
    siteId: id.nullable(),
    siteName: z.string().nullable(),
    siteCode: z.string().nullable(),
    address: z.string().nullable(),
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
    radiusMeters: z.number().nullable(),
    branchId: id.nullable(),
    branchName: z.string().nullable(),
  })
  .nullable();

export const punchLocationSchema = z.object({
  id,
  action: z.string(),
  receivedAtUtc: z.string(),
  deviceCapturedAtUtc: z.string().nullable(),
  businessDate: date.nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  accuracyMeters: z.number().nullable(),
  isOffline: z.boolean(),
  siteName: z.string().nullable(),
  branchName: z.string().nullable(),
  assessmentOutcome: z.string().nullable(),
  distanceMeters: z.number().nullable(),
  insideGeofence: z.boolean().nullable(),
});

export const employeeTrackingSchema = z.object({
  employeeId: id,
  employeeName: z.string().nullable(),
  employeeNumber: z.number(),
  staffCategory: z.string().nullable(),
  assignedLocation: assignedLocationSchema,
  latestCheckIn: punchLocationSchema.nullable(),
  checkInHistory: z.array(punchLocationSchema),
});

export type EmployeeTracking = z.infer<typeof employeeTrackingSchema>;
export type PunchLocation = z.infer<typeof punchLocationSchema>;
export type AssignedLocation = z.infer<typeof assignedLocationSchema>;
