export interface Camera {
  id: string;
  model: string;
  serialNumber: string;
}

export interface RentalOrder {
  id: string;
  cameraModel: string;
  cameraSerialNumber: string;
  renterName: string;
  customerService: string;
  salesperson: string;
  pickupDate: string;
  pickupTime: 'morning' | 'afternoon' | 'evening';
  returnDate: string;
  returnTime: 'morning' | 'afternoon' | 'evening';
  depositStatus: string;
  notes: string;
  createdAt: string;
}

export interface TimeSlot {
  morning: boolean;
  afternoon: boolean;
  evening: boolean;
}