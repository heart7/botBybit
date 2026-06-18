/** Navigation param lists (typed routes). */

export type PetsStackParamList = {
  PetsList: undefined;
  PetDetail: { petId: string };
  PetForm: { petId?: string };
  LogWeight: { petId: string };
};

export type ScanStackParamList = {
  ScanPetPicker: undefined;
  ScanForm: { petId: string };
  ScanResult: { scanId: string };
};

export type MainTabParamList = {
  Home: undefined;
  Pets: undefined;
  Scan: undefined;
  Records: undefined;
  Account: undefined;
};
