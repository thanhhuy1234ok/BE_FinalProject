// import { Role } from 'src/roles/entities/role.entity';

export interface IUser {
  id: number;
  name: string;
  email: string;
  // role: Role;
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
