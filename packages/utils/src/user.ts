export interface HermesUser {
  id: number;
  admin: boolean;
  email: string;
  name: string;
  phone: string | null;
  location: string | null;
}
