// Mock data for the ERP system

export const customers = [
  {
    code: 'C001',
    name: 'Sharma Construction Ltd.',
    billType: 'Tax Invoice',
    gstNumber: '27AAAAA0000A1Z5',
    address: 'Plot No. 45, Industrial Area, Mumbai',
    phone: '9876543210',
    creditLimit: 500000,
    status: 'Active',
    isIGSTBill: false,
    vehicles: [
      { regNo: 'MH-02-AB-1234', driverName: 'Ramesh Singh', driverPhone: '9876543211', isDefaultVehicle: true },
      { regNo: 'MH-02-AB-5678', driverName: 'Suresh Patel', driverPhone: '9876543212', isDefaultVehicle: false }
    ]
  },
  {
    code: 'C002',
    name: 'Patel Builders',
    billType: 'Invoice',
    gstNumber: '',
    address: 'Sector 12, Navi Mumbai',
    phone: '9876543220',
    creditLimit: 300000,
    status: 'Active',
    isIGSTBill: false,
    vehicles: [
      { regNo: 'MH-04-CD-9012', driverName: 'Vijay Kumar', driverPhone: '9876543221', isDefaultVehicle: true }
    ]
  },
  {
    code: 'C003',
    name: 'Infra Projects India',
    billType: 'Tax Invoice',
    gstNumber: '27BBBBB0000B1Z5',
    address: 'Thane West, Maharashtra',
    phone: '9876543230',
    creditLimit: 750000,
    status: 'Active',
    isIGSTBill: true,
    vehicles: [
      { regNo: 'MH-05-EF-3456', driverName: 'Manoj Gupta', driverPhone: '9876543231', isDefaultVehicle: true }
    ]
  },
  {
    code: 'C004',
    name: 'Local Retail (No Vehicles)',
    billType: 'Invoice',
    gstNumber: '',
    address: 'Shop 23, Market Road, Thane',
    phone: '9876543240',
    creditLimit: 50000,
    status: 'Active',
    isIGSTBill: false,
    vehicles: []
  },
  {
    code: 'C005',
    name: 'Old Customer (Inactive)',
    billType: 'Tax Invoice',
    gstNumber: '27CCCCC0000C1Z5',
    address: 'Old Address, Mumbai',
    phone: '9876543250',
    creditLimit: 100000,
    status: 'Inactive',
    isIGSTBill: false,
    vehicles: [
      { regNo: 'MH-01-ZZ-9999', driverName: 'Test Driver', driverPhone: '9876543251', isDefaultVehicle: true }
    ]
  }
];

export const suppliers = [
  {
    code: 'S001',
    name: 'RK Stone Suppliers',
    billControlAC: 'Purchase A/C - Stone',
    supplierType: 'Ton Based',
    vehicleNumber: 'MH-03-XY-1111',
    emptyWeight: 8500,
    status: 'Active'
  },
  {
    code: 'S002',
    name: 'Cubic Materials Co.',
    billControlAC: 'Purchase A/C - Cubic',
    supplierType: 'Cubic',
    vehicleNumber: 'MH-06-ZZ-2222',
    length: 12,
    breadth: 6,
    height: 4,
    adjustmentCuFt: 50,
    emptyWeight: 9000,
    status: 'Active'
  },
  {
    code: 'S003',
    name: 'Mountain Rock Industries',
    billControlAC: 'Purchase A/C - Stone',
    supplierType: 'Ton Based',
    vehicleNumber: 'MH-07-AA-3333',
    emptyWeight: 8200,
    status: 'Active'
  }
];

export const items = [
  {
    code: 'I001',
    name: '20mm Blue Metal',
    itemGroup: 'Blue Metal',
    itemSubgroup: '20mm',
    rawMaterial: true,
    saleMaterial: true,
    hsnCode: '2517',
    gstPercent: 5,
    sellingPrice: 850,
    defaultPrinter: 'Token Printer 1',
    status: 'Active',
    isActive: true
  },
  {
    code: 'I002',
    name: '10mm Blue Metal',
    itemGroup: 'Blue Metal',
    itemSubgroup: '10mm',
    rawMaterial: true,
    saleMaterial: true,
    hsnCode: '2517',
    gstPercent: 5,
    sellingPrice: 900,
    defaultPrinter: 'Token Printer 1',
    status: 'Active',
    isActive: true
  },
  {
    code: 'I003',
    name: '40mm Blue Metal',
    itemGroup: 'Blue Metal',
    itemSubgroup: '40mm',
    rawMaterial: true,
    saleMaterial: true,
    hsnCode: '2517',
    gstPercent: 5,
    sellingPrice: 800,
    defaultPrinter: 'Token Printer 1',
    status: 'Active',
    isActive: true
  },
  {
    code: 'I004',
    name: 'Stone Dust',
    itemGroup: 'Dust',
    itemSubgroup: 'Fine',
    rawMaterial: false,
    saleMaterial: true,
    hsnCode: '2517',
    gstPercent: 5,
    sellingPrice: 500,
    defaultPrinter: 'Token Printer 1',
    status: 'Active',
    isActive: true
  }
];

export const vehicles = [
  {
    id: 'VEH001',
    regNo: 'MH-08-JJ-4444',
    vehicleName: 'Tata 407',
    workCentre: 'Production Unit 1',
    tankCapacity: 80,
    emptyWeight: 2500,
    meterReadingOpening: 25000,
    meterReadingMax: 100000,
    hourReadingOpening: 5000,
    hourReadingMax: 20000,
    status: 'Active',
    isActive: true
  },
  {
    id: 'VEH002',
    regNo: 'MH-09-KK-5555',
    vehicleName: 'Eicher 10.90',
    workCentre: 'Production Unit 2',
    tankCapacity: 100,
    emptyWeight: 3200,
    meterReadingOpening: 18000,
    meterReadingMax: 100000,
    hourReadingOpening: 3500,
    hourReadingMax: 20000,
    status: 'Active',
    isActive: true
  }
];

export const billSundries = [
  {
    id: 'BS001',
    code: 'BS001',
    name: '(+) Round Off',
    type: 'ADDITIVE',
    sundryType: 'ADDITIVE',
    calculationMode: 'FIXED',
    defaultValue: 0,
    isEditableAtBilling: true,
    applicableModules: ['Sales', 'Purchase'],
    status: 'Active',
    isActive: true
  },
  {
    id: 'BS002',
    code: 'BS002',
    name: '(-) Round Off',
    type: 'DEDUCTIVE',
    sundryType: 'DEDUCTIVE',
    calculationMode: 'FIXED',
    defaultValue: 0,
    isEditableAtBilling: true,
    applicableModules: ['Sales', 'Purchase'],
    status: 'Active',
    isActive: true
  },
  {
    id: 'BS003',
    code: 'BS003',
    name: 'DRIVER BATA',
    type: 'DEDUCTIVE',
    sundryType: 'DEDUCTIVE',
    calculationMode: 'FIXED',
    defaultValue: 50,
    isEditableAtBilling: true,
    applicableModules: ['Sales'],
    status: 'Active',
    isActive: true
  },
  {
    id: 'BS004',
    code: 'BS004',
    name: 'Loading Charges',
    type: 'ADDITIVE',
    sundryType: 'ADDITIVE',
    calculationMode: 'PERCENTAGE',
    defaultValue: 2,
    isEditableAtBilling: true,
    applicableModules: ['Sales'],
    status: 'Active',
    isActive: true
  }
];

export const todayTokens = [
  {
    tokenNo: '001',
    entryNo: '1/25',
    vehicleNo: 'MH-02-AB-1234',
    customerCode: 'C001',
    customerName: 'Sharma Construction Ltd.',
    itemCode: 'I001',
    itemName: '20mm Blue Metal',
    emptyWeight: 8500,
    loadWeight: 20500,
    netWeight: 12000,
    status: 'OPEN',
    createdAt: '2026-03-13T08:15:00',
    createdBy: 'Rajesh Kumar'
  },
  {
    tokenNo: '002',
    entryNo: '2/25',
    vehicleNo: 'MH-04-CD-9012',
    customerCode: 'C002',
    customerName: 'Patel Builders',
    itemCode: 'I002',
    itemName: '10mm Blue Metal',
    emptyWeight: 9200,
    loadWeight: 21500,
    netWeight: 12300,
    status: 'OPEN',
    createdAt: '2026-03-13T08:45:00',
    createdBy: 'Rajesh Kumar'
  },
  {
    tokenNo: '003',
    entryNo: '3/25',
    vehicleNo: 'MH-05-EF-3456',
    customerCode: 'C003',
    customerName: 'Infra Projects India',
    itemCode: 'I003',
    itemName: '6mm Blue Metal',
    emptyWeight: 8800,
    loadWeight: 19800,
    netWeight: 11000,
    status: 'OPEN',
    createdAt: '2026-03-13T09:30:00',
    createdBy: 'Rajesh Kumar'
  }
];

export const todayEntryPasses = [
  {
    entryPassNo: '001',
    entryNo: '1/25',
    vehicleNo: 'MH-03-XY-1111',
    supplierCode: 'S001',
    supplierName: 'RK Stone Suppliers',
    itemCode: 'I001',
    itemName: '20mm Blue Metal',
    loadWeight: 22500,
    emptyWeight: null,
    netWeight: null,
    status: 'Pending',
    createdAt: '2026-02-28T09:00:00',
    createdBy: 'Rajesh Kumar'
  }
];

export const todaySalesBills = [
  {
    billNo: 'INV/02/001/26',
    tokenNo: '002',
    customerCode: 'C002',
    customerName: 'Patel Builders',
    itemCode: 'I002',
    itemName: '10mm Blue Metal',
    quantity: 12.3,
    rate: 900,
    amount: 11070,
    gst: 0,
    total: 11070,
    paymentMode: 'Cash',
    driverBata: 50,
    netAmount: 11020,
    createdAt: '2026-02-28T09:15:00',
    createdBy: 'Amit Sharma'
  }
];

export const auditLogs = [
  {
    id: 'AL001',
    module: 'Sales Bill',
    recordId: 'INV/02/001/26',
    fieldName: 'Rate',
    oldValue: '850',
    newValue: '900',
    changedBy: 'Amit Sharma',
    changedAt: '2026-02-28T09:10:00',
    reason: 'Special rate applied',
    approvedBy: 'Rajesh Kumar'
  },
  {
    id: 'AL002',
    module: 'Token',
    recordId: '001',
    fieldName: 'Empty Weight',
    oldValue: '8400',
    newValue: '8500',
    changedBy: 'Rajesh Kumar',
    changedAt: '2026-02-28T08:16:00',
    reason: 'Weight stabilization',
    approvedBy: null
  }
];

export const deviceLogs = [
  {
    id: 'DL001',
    deviceType: 'Weighbridge',
    deviceName: 'Weighbridge 1',
    eventType: 'Weight Capture',
    status: 'Success',
    message: 'Weight captured: 8500 kg',
    timestamp: '2026-02-28T08:15:30'
  },
  {
    id: 'DL002',
    deviceType: 'Camera',
    deviceName: 'Front Camera',
    eventType: 'Image Capture',
    status: 'Success',
    message: 'Image captured and stored',
    timestamp: '2026-02-28T08:15:35'
  },
  {
    id: 'DL003',
    deviceType: 'Barrier',
    deviceName: 'Boom Barrier',
    eventType: 'Open',
    status: 'Success',
    message: 'Barrier opened for token 001',
    timestamp: '2026-02-28T08:15:45'
  },
  {
    id: 'DL004',
    deviceType: 'Printer',
    deviceName: 'Token Printer',
    eventType: 'Print',
    status: 'Warning',
    message: 'Low paper warning',
    timestamp: '2026-02-28T08:15:40'
  }
];