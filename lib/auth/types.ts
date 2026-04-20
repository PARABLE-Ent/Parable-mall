import type { AdminRole, GradeLevel, UserRole } from '@prisma/client';
import 'next-auth';

export type { AdminRole, GradeLevel, UserRole };

declare module 'next-auth' {
  interface User {
    role?: UserRole;
    gradeLevel?: GradeLevel;
  }

  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      role?: UserRole;
      gradeLevel?: GradeLevel;
    };
  }
}

export interface AdminSession {
  adminUser: {
    id: string;
    email: string;
    name: string;
    role: AdminRole;
  };
}
