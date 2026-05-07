export const drivers = [
  {
    id: '1',
    driverCode: 'DRV001',
    driverName: 'Ramesh Kumar',
    mobile: '+91 9876543210',
    licenseNo: 'MH1420150012345',
    licenseExpiry: '2027-03-15',
    address: 'Plot No. 12, Kasarwadi, Pune - 411034, Maharashtra, India',
    isActive: true
  },
  {
    id: '2',
    driverCode: 'DRV002',
    driverName: 'Suresh Patil',
    mobile: '+91 9123456789',
    licenseNo: 'MH0520160023456',
    licenseExpiry: '2026-04-20',
    address: 'Flat 203, Shivaji Nagar, Pune - 411005, Maharashtra, India',
    isActive: true
  },
  {
    id: '3',
    driverCode: 'DRV003',
    driverName: 'Mahesh Singh',
    mobile: '+91 9988776655',
    licenseNo: 'MH1220140034567',
    licenseExpiry: '2025-12-10',
    address: 'Bungalow 5, Kothrud, Pune - 411038, Maharashtra, India',
    isActive: false
  },
  {
    id: '4',
    driverCode: 'DRV004',
    driverName: 'Vijay Kumar',
    mobile: '+91 9112233445',
    licenseNo: 'MH0220170045678',
    licenseExpiry: '2028-06-25',
    address: 'House 12A, Wakad, Pune - 411057, Maharashtra, India',
    isActive: true
  }
];

export const getActiveDrivers = () => drivers.filter(d => d.isActive);

export const getDriverById = (id: string) => drivers.find(d => d.id === id);

export const getDriverByCode = (code: string) => drivers.find(d => d.driverCode === code);
