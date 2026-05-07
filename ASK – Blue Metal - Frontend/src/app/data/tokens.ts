// Shared token data store for Token Creation and Token Cancel modules

export interface Token {
  tokenNo: string;
  entryNo: string;
  tokenDateTime: string;
  vehicleNo: string;
  customerCode: string;
  customerName: string;
  driverName: string;
  driverMobile: string;
  itemCode: string;
  itemName: string;
  printerId: string;
  printerName: string;
  emptyWeight: number | null;
  weightCapturedAt: string | null;
  anprText: string;
  anprCapturedAt: string | null;
  anprImageRef: string | null;
  loadImageRef: string | null;
  loadCapturedAt: string | null;
  barrierEventId: string;
  barrierOpenStatus: 'Open' | 'Closed' | 'Failed';
  printStatus: 'Printed' | 'Not Printed';
  status: 'OPEN' | 'BILLED' | 'CANCELLED';
  billedBillId: string | null;
  cancelledReason: string;
  cancelledBy: string | null;
  cancelledAt: string | null;
  createdBy: string;
  createdAt: string;
}

// Mock tokens data - simulating database
export let mockTokens: Token[] = [
  {
    tokenNo: 'TKN-0234',
    entryNo: '13141/26',
    tokenDateTime: '2026-03-08 09:30:00',
    vehicleNo: 'MH-02-AB-1234',
    customerCode: 'C001',
    customerName: 'Sharma Construction Ltd.',
    driverName: 'Ramesh Singh',
    driverMobile: '9876543211',
    itemCode: 'I001',
    itemName: 'Blue Metal 20mm',
    printerId: 'PRT001',
    printerName: 'Token Printer 1',
    emptyWeight: 18500,
    weightCapturedAt: '08/03/2026, 09:31:25 AM',
    anprText: 'MH02AB1234',
    anprCapturedAt: '08/03/2026, 09:31:30 AM',
    anprImageRef: 'ANPR_IMG_001',
    loadImageRef: 'LOAD_IMG_001',
    loadCapturedAt: '08/03/2026, 09:31:35 AM',
    barrierEventId: 'BRR_1709877095000',
    barrierOpenStatus: 'Open',
    printStatus: 'Printed',
    status: 'OPEN',
    billedBillId: null,
    cancelledReason: '',
    cancelledBy: null,
    cancelledAt: null,
    createdBy: 'Operator 1',
    createdAt: '2026-03-08 09:30:00'
  },
  {
    tokenNo: 'TKN-0235',
    entryNo: '13142/26',
    tokenDateTime: '2026-03-08 10:15:00',
    vehicleNo: 'MH-04-CD-9012',
    customerCode: 'C002',
    customerName: 'Patel Builders',
    driverName: 'Vijay Kumar',
    driverMobile: '9876543221',
    itemCode: 'I002',
    itemName: 'Blue Metal 12mm',
    printerId: 'PRT001',
    printerName: 'Token Printer 1',
    emptyWeight: 17200,
    weightCapturedAt: '08/03/2026, 10:16:12 AM',
    anprText: 'MH04CD9012',
    anprCapturedAt: '08/03/2026, 10:16:18 AM',
    anprImageRef: 'ANPR_IMG_002',
    loadImageRef: 'LOAD_IMG_002',
    loadCapturedAt: '08/03/2026, 10:16:22 AM',
    barrierEventId: 'BRR_1709879700000',
    barrierOpenStatus: 'Open',
    printStatus: 'Printed',
    status: 'OPEN',
    billedBillId: null,
    cancelledReason: '',
    cancelledBy: null,
    cancelledAt: null,
    createdBy: 'Operator 1',
    createdAt: '2026-03-08 10:15:00'
  },
  {
    tokenNo: 'TKN-0236',
    entryNo: '13143/26',
    tokenDateTime: '2026-03-08 11:00:00',
    vehicleNo: 'MH-05-EF-3456',
    customerCode: 'C003',
    customerName: 'Infra Projects India',
    driverName: 'Manoj Gupta',
    driverMobile: '9876543231',
    itemCode: 'I003',
    itemName: 'Blue Metal 40mm',
    printerId: 'PRT001',
    printerName: 'Token Printer 1',
    emptyWeight: 19000,
    weightCapturedAt: '08/03/2026, 11:01:45 AM',
    anprText: 'MH05EF3456',
    anprCapturedAt: '08/03/2026, 11:01:50 AM',
    anprImageRef: 'ANPR_IMG_003',
    loadImageRef: 'LOAD_IMG_003',
    loadCapturedAt: '08/03/2026, 11:01:55 AM',
    barrierEventId: 'BRR_1709882400000',
    barrierOpenStatus: 'Open',
    printStatus: 'Printed',
    status: 'BILLED',
    billedBillId: 'BILL-001',
    cancelledReason: '',
    cancelledBy: null,
    cancelledAt: null,
    createdBy: 'Operator 2',
    createdAt: '2026-03-08 11:00:00'
  },
  {
    tokenNo: 'TKN-0237',
    entryNo: '13144/26',
    tokenDateTime: '2026-03-08 14:30:00',
    vehicleNo: 'MH-02-AB-5678',
    customerCode: 'C001',
    customerName: 'Sharma Construction Ltd.',
    driverName: 'Suresh Patel',
    driverMobile: '9876543212',
    itemCode: 'I001',
    itemName: 'Blue Metal 20mm',
    printerId: 'PRT002',
    printerName: 'Token Printer 2',
    emptyWeight: 18000,
    weightCapturedAt: '08/03/2026, 02:31:10 PM',
    anprText: 'MH02AB5678',
    anprCapturedAt: '08/03/2026, 02:31:15 PM',
    anprImageRef: 'ANPR_IMG_004',
    loadImageRef: 'LOAD_IMG_004',
    loadCapturedAt: '08/03/2026, 02:31:20 PM',
    barrierEventId: 'BRR_1709894400000',
    barrierOpenStatus: 'Open',
    printStatus: 'Printed',
    status: 'CANCELLED',
    billedBillId: null,
    cancelledReason: 'Vehicle breakdown - cannot complete delivery',
    cancelledBy: 'Supervisor',
    cancelledAt: '2026-03-08 15:45:00',
    createdBy: 'Operator 1',
    createdAt: '2026-03-08 14:30:00'
  },
  {
    tokenNo: 'TKN-0238',
    entryNo: '13145/26',
    tokenDateTime: '2026-03-09 08:00:00',
    vehicleNo: 'MH-04-CD-9012',
    customerCode: 'C002',
    customerName: 'Patel Builders',
    driverName: 'Vijay Kumar',
    driverMobile: '9876543221',
    itemCode: 'I004',
    itemName: 'Stone Chips 12mm',
    printerId: 'PRT001',
    printerName: 'Token Printer 1',
    emptyWeight: 17500,
    weightCapturedAt: '09/03/2026, 08:01:30 AM',
    anprText: 'MH04CD9012',
    anprCapturedAt: '09/03/2026, 08:01:35 AM',
    anprImageRef: 'ANPR_IMG_005',
    loadImageRef: 'LOAD_IMG_005',
    loadCapturedAt: '09/03/2026, 08:01:40 AM',
    barrierEventId: 'BRR_1709957700000',
    barrierOpenStatus: 'Open',
    printStatus: 'Printed',
    status: 'OPEN',
    billedBillId: null,
    cancelledReason: '',
    cancelledBy: null,
    cancelledAt: null,
    createdBy: 'Operator 2',
    createdAt: '2026-03-09 08:00:00'
  }
];

// Helper functions to manage tokens
export const addToken = (token: Token) => {
  mockTokens.push(token);
};

export const updateToken = (tokenNo: string, updates: Partial<Token>) => {
  const index = mockTokens.findIndex(t => t.tokenNo === tokenNo);
  if (index !== -1) {
    mockTokens[index] = { ...mockTokens[index], ...updates };
  }
};

export const getTokenByNo = (tokenNo: string): Token | undefined => {
  return mockTokens.find(t => t.tokenNo === tokenNo);
};

export const getOpenTokens = (): Token[] => {
  return mockTokens.filter(t => t.status === 'OPEN');
};

export const getBilledTokens = (): Token[] => {
  return mockTokens.filter(t => t.status === 'BILLED');
};

export const getCancelledTokens = (): Token[] => {
  return mockTokens.filter(t => t.status === 'CANCELLED');
};

export const cancelToken = (tokenNo: string, reason: string, cancelledBy: string) => {
  updateToken(tokenNo, {
    status: 'CANCELLED',
    cancelledReason: reason,
    cancelledBy: cancelledBy,
    cancelledAt: new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })
  });
};

// Generate next token number
export const generateNextTokenNo = (): string => {
  if (mockTokens.length === 0) {
    return 'TKN-0001';
  }
  
  const lastToken = mockTokens[mockTokens.length - 1];
  const lastNumber = parseInt(lastToken.tokenNo.split('-')[1]);
  const nextNumber = lastNumber + 1;
  return `TKN-${nextNumber.toString().padStart(4, '0')}`;
};
