export const workCentres = [
  {
    id: '1',
    workCentreCode: 'WC001',
    workCentreName: 'Main Processing Unit',
    address: 'Plot No. 45, Industrial Area Phase-II, Sector 12, Pune - 411058, Maharashtra, India',
    contactPerson: 'Rajesh Sharma',
    phone: '+91 9876543210',
    isActive: true
  },
  {
    id: '2',
    workCentreCode: 'WC002',
    workCentreName: 'Secondary Processing',
    address: 'Plot No. 78, MIDC Industrial Area, Pune - 411019, Maharashtra, India',
    contactPerson: 'Amit Kumar',
    phone: '+91 9123456789',
    isActive: true
  },
  {
    id: '3',
    workCentreCode: 'WC003',
    workCentreName: 'Quality Control Unit',
    address: 'Plot No. 12, Pimpri-Chinchwad Industrial Area, Pune - 411033, Maharashtra, India',
    contactPerson: 'Suresh Patil',
    phone: '+91 9988776655',
    isActive: false
  }
];

export const getActiveWorkCentres = () => workCentres.filter(wc => wc.isActive);

export const getWorkCentreById = (id: string) => workCentres.find(wc => wc.id === id);

export const getWorkCentreByCode = (code: string) => workCentres.find(wc => wc.workCentreCode === code);
