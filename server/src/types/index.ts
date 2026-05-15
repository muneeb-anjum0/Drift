export interface JwtUserPayload {
  id: string;
  email: string;
}

export interface SafeUser {
  _id: string;
  name: string;
  email: string;
  avatar: string;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}
