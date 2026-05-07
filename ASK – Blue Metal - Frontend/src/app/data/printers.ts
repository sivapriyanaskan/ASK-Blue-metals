export const mockPrinters = [
  {
    id: 'PRT001',
    printerId: 'PRT001',
    printerName: 'Token Printer 1',
    printerCode: 'TP1',
    printerType: 'TOKEN',
    deviceIdentifier: 'THERMAL-001',
    ipAddress: '192.168.1.101',
    port: 9100,
    location: 'Weighbridge Gate 1',
    isDefault: true,
    isActive: true
  },
  {
    id: 'PRT002',
    printerId: 'PRT002',
    printerName: 'Token Printer 2',
    printerCode: 'TP2',
    printerType: 'TOKEN',
    deviceIdentifier: 'THERMAL-002',
    ipAddress: '192.168.1.102',
    port: 9100,
    location: 'Weighbridge Gate 2',
    isDefault: false,
    isActive: true
  },
  {
    id: 'PRT003',
    printerId: 'PRT003',
    printerName: 'Bill Printer 1',
    printerCode: 'BP1',
    printerType: 'BILL',
    deviceIdentifier: 'LASER-001',
    ipAddress: '192.168.1.201',
    port: 9100,
    location: 'Billing Office',
    isDefault: true,
    isActive: true
  },
  {
    id: 'PRT004',
    printerId: 'PRT004',
    printerName: 'Report Printer',
    printerCode: 'RP1',
    printerType: 'REPORT',
    deviceIdentifier: 'LASER-002',
    ipAddress: '192.168.1.301',
    port: 9100,
    location: 'Accounts Office',
    isDefault: true,
    isActive: true
  },
  {
    id: 'PRT005',
    printerId: 'PRT005',
    printerName: 'Old Printer (Inactive)',
    printerCode: 'OLD',
    printerType: 'BILL',
    deviceIdentifier: 'OLD-DEVICE',
    ipAddress: '192.168.1.99',
    port: 9100,
    location: 'Storage',
    isDefault: false,
    isActive: false
  }
];

export const getActivePrinters = () => {
  return mockPrinters.filter(p => p.isActive);
};
