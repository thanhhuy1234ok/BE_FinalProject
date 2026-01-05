export interface IUser {
  id: string;
  name: string;
  email: string;
  role_id: number;
  avatar: string;
  // permissions?: Permission[];
}

// Định nghĩa interface Permission cho các quyền
export interface Permission {
  id: number;
  name: string;
  apiPath: string;
  module: string;
}
