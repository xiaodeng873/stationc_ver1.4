import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Patient {
  id: string;
  name: string;
  gender: string;
  date_of_birth: string;
  [key: string]: any;
}

interface PatientContextType {
  selectedPatient: Patient | null;
  setSelectedPatient: (patient: Patient | null) => void;
  clearSelectedPatient: () => void;
}

const PatientContext = createContext<PatientContextType | undefined>(undefined);

export const PatientProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const clearSelectedPatient = () => setSelectedPatient(null);

  return (
    <PatientContext.Provider value={{ selectedPatient, setSelectedPatient, clearSelectedPatient }}>
      {children}
    </PatientContext.Provider>
  );
};

export const usePatient = () => {
  const context = useContext(PatientContext);
  if (context === undefined) {
    throw new Error('usePatient must be used within a PatientProvider');
  }
  return context;
};
