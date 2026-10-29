import type { Operator } from '../types'

/** Clearly labelled sample shift identities. No authentication is performed. */
export const DEMO_OPERATORS: Operator[] = [
  {
    id: 'DEMO-001',
    name: 'Demo Conductor',
    depot: 'Kopargaon',
    busNo: 'MH-17-DEMO',
    serviceNo: 'ORD-101',
    machineNo: 'ETM-0001',
    startedAt: new Date().toISOString(),
  },
  {
    id: 'DEMO-002',
    name: 'S. Deshmukh (demo)',
    depot: 'Pune',
    busNo: 'MH-12-DEMO',
    serviceNo: 'EXP-204',
    machineNo: 'ETM-0002',
    startedAt: new Date().toISOString(),
  },
  {
    id: 'DEMO-003',
    name: 'A. Patil (demo)',
    depot: 'Nashik',
    busNo: 'MH-15-DEMO',
    serviceNo: 'SHV-310',
    machineNo: 'ETM-0003',
    startedAt: new Date().toISOString(),
  },
]
