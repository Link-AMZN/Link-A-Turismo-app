import { eq, and, or, desc, sql } from 'drizzle-orm';
import { db } from '../../db';
import { users, driverDocuments } from '../../shared/schema';
import { 
  UserRole, 
  VerificationStatus 
} from '../../src/shared/types';
import type { 
  User, 
  CreateUserData, 
  UpdateUserData, 
  DriverDocuments,
  DriverStats 
} from '../types';

// ✅ CORREÇÃO: Definir tipos compatíveis com o schema
export type SchemaUserType = 'client' | 'host' | 'driver' | 'admin';

// ✅ CORREÇÃO: Extender CreateUserData para incluir campos obrigatórios
export interface ExtendedCreateUserData {
  id: string; // Campo obrigatório
  email?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  phone?: string;
  userType?: SchemaUserType;
  roles?: string[];
  canOfferServices?: boolean;
  profileImageUrl?: string;
  firebaseUid?: string;
}

export interface ExtendedUpdateUserData extends Partial<Omit<ExtendedCreateUserData, 'id'>> {
  // Campos específicos para update
  verificationStatus?: VerificationStatus;
  isVerified?: boolean;
  rating?: number;
  totalReviews?: number;
}

export interface UpsertUserData extends ExtendedCreateUserData {
  // Para upsert, id é obrigatório
}

export interface FirebaseLinkData {
  userId: string;
  firebaseUid: string;
}

// Helper functions for proper type mapping
function mapToUser(user: any): User {
  // Converter datas explicitamente
  const createdAt = user.createdAt 
    ? (user.createdAt instanceof Date ? user.createdAt : new Date(user.createdAt))
    : new Date();
  
  const updatedAt = user.updatedAt 
    ? (user.updatedAt instanceof Date ? user.updatedAt : new Date(user.updatedAt))
    : new Date();
  
  const verificationDate = user.verificationDate 
    ? (user.verificationDate instanceof Date ? user.verificationDate : new Date(user.verificationDate))
    : null;
  
  const badgeEarnedDate = user.badgeEarnedDate 
    ? (user.badgeEarnedDate instanceof Date ? user.badgeEarnedDate : new Date(user.badgeEarnedDate))
    : null;
  
  const dateOfBirth = user.dateOfBirth 
    ? (user.dateOfBirth instanceof Date ? user.dateOfBirth : new Date(user.dateOfBirth))
    : null;

  return {
    ...user,
    // Garantir conversão numérica
    rating: user.rating ? Number(user.rating) : 0,
    totalReviews: user.totalReviews ? Number(user.totalReviews) : 0,
    
    // Garantir booleanos
    isVerified: Boolean(user.isVerified),
    canOfferServices: Boolean(user.canOfferServices),
    registrationCompleted: Boolean(user.registrationCompleted),
    
    // Garantir arrays
    roles: Array.isArray(user.roles) ? user.roles : ['client'],
    
    // Datas convertidas explicitamente
    createdAt,
    updatedAt,
    verificationDate,
    badgeEarnedDate,
    dateOfBirth,
    
    // Valores padrão para campos opcionais
    email: user.email || '',
    phone: user.phone || '',
    userType: user.userType || 'client',
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    profileImageUrl: user.profileImageUrl || '',
    verificationStatus: user.verificationStatus || 'pending',
    verificationNotes: user.verificationNotes || '',
    identityDocumentUrl: user.identityDocumentUrl || '',
    identityDocumentType: user.identityDocumentType || '',
    profilePhotoUrl: user.profilePhotoUrl || '',
    fullName: user.fullName || '',
    documentNumber: user.documentNumber || '',
    verificationBadge: user.verificationBadge || '',
    avatar: user.avatar || ''
  } as User;
}

function mapToDriverDocuments(docs: any): DriverDocuments {
  const updatedAt = docs.updatedAt 
    ? (docs.updatedAt instanceof Date ? docs.updatedAt : new Date(docs.updatedAt))
    : new Date();
  
  const verificationDate = docs.verificationDate 
    ? (docs.verificationDate instanceof Date ? docs.verificationDate : new Date(docs.verificationDate))
    : null;

  // ✅ CORREÇÃO: Não incluir createdAt no retorno se não existir no tipo DriverDocuments
  const { createdAt, ...cleanDocs } = docs;

  return {
    ...cleanDocs,
    updatedAt,
    verificationDate,
    isVerified: Boolean(docs.isVerified),
    vehicleYear: docs.vehicleYear ? Number(docs.vehicleYear) : null
  } as DriverDocuments;
}

// Helper para busca com ILIKE sem @ts-ignore
function ilike(column: any, pattern: string) {
  return sql`${column} ILIKE ${pattern}`;
}

export interface IAuthStorage {
  // Basic user operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(userData: ExtendedCreateUserData): Promise<User>;
  updateUser(id: string, data: ExtendedUpdateUserData): Promise<User>;
  deleteUser(id: string): Promise<void>;
  
  // Firebase integration
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  linkFirebaseAccount(userId: string, firebaseUid: string): Promise<void>;
  
  // Role management
  getUsersByRole(role: UserRole): Promise<User[]>;
  updateUserRoles(userId: string, roles: UserRole[]): Promise<User>;
  addUserRole(userId: string, role: UserRole): Promise<User>;
  removeUserRole(userId: string, role: UserRole): Promise<User>;
  
  // Verification
  updateVerificationStatus(userId: string, status: VerificationStatus): Promise<User>;
  getUnverifiedUsers(): Promise<User[]>;
  getPendingVerifications(): Promise<User[]>;
  
  // Driver-specific operations
  updateDriverDocuments(driverId: string, documents: Partial<Omit<DriverDocuments, 'createdAt'>>): Promise<void>;
  getDriverDocuments(driverId: string): Promise<DriverDocuments | undefined>;
  getDriverStatistics(driverId: string): Promise<DriverStats>;
  
  // Search and listing
  searchUsers(query: string): Promise<User[]>;
  getUsersWithPagination(page: number, limit: number): Promise<{ users: User[], total: number }>;
  
  // Additional methods needed by controllers
  upsertUser(userData: UpsertUserData): Promise<User>;
  getUsersByType(userType: SchemaUserType): Promise<User[]>;
}

export class DatabaseAuthStorage implements IAuthStorage {
  
  // ===== BASIC USER OPERATIONS =====
  
  async getUser(id: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user ? mapToUser(user) : undefined;
    } catch (error) {
      console.error('Error fetching user:', error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user ? mapToUser(user) : undefined;
    } catch (error) {
      console.error('Error fetching user by email:', error);
      return undefined;
    }
  }

  async createUser(userData: ExtendedCreateUserData): Promise<User> {
    try {
      // ✅ CORREÇÃO: Converter userType para tipo compatível com schema
      const userTypeMap: Record<string, SchemaUserType> = {
        'client': 'client',
        'driver': 'driver',
        'admin': 'admin',
        'hotel_manager': 'host'
      };
      
      const schemaUserType = userData.userType ? userTypeMap[userData.userType] || 'client' : 'client';

      // ✅ CORREÇÃO: Preparar dados conforme schema do Drizzle
      const userValues = {
        id: userData.id, // Campo obrigatório
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        fullName: userData.fullName,
        phone: userData.phone,
        userType: schemaUserType,
        roles: userData.roles || ['client'],
        canOfferServices: userData.canOfferServices ?? false,
        profileImageUrl: userData.profileImageUrl,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const [user] = await db
        .insert(users)
        .values(userValues)
        .returning();
      return mapToUser(user);
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  async updateUser(id: string, data: ExtendedUpdateUserData): Promise<User> {
    try {
      // ✅ CORREÇÃO: Converter userType para tipo compatível com schema se fornecido
      const updateData: any = {
        ...data,
        updatedAt: new Date(),
      };

      if (data.userType) {
        const userTypeMap: Record<string, SchemaUserType> = {
          'client': 'client',
          'driver': 'driver',
          'admin': 'admin',
          'hotel_manager': 'host'
        };
        updateData.userType = userTypeMap[data.userType] || 'client';
      }

      const [user] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, id))
        .returning();
      return mapToUser(user);
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error('Failed to update user');
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      await db.delete(users).where(eq(users.id, id));
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new Error('Failed to delete user');
    }
  }

  // ===== FIREBASE INTEGRATION =====
  
  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    try {
      // ✅ CORREÇÃO: Buscando pelo campo id (conforme schema atual)
      const [user] = await db.select().from(users).where(eq(users.id, firebaseUid));
      return user ? mapToUser(user) : undefined;
    } catch (error) {
      console.error('Error fetching user by Firebase UID:', error);
      return undefined;
    }
  }

  async linkFirebaseAccount(userId: string, firebaseUid: string): Promise<void> {
    try {
      // ✅ CORREÇÃO: Implementação real que persiste no banco
      // Atualizando o ID do usuário para o Firebase UID
      await db
        .update(users)
        .set({
          id: firebaseUid,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
      
      console.log(`Successfully linked user ${userId} with Firebase UID ${firebaseUid}`);
    } catch (error) {
      console.error('Error linking Firebase account:', error);
      throw new Error('Failed to link Firebase account');
    }
  }

  // ===== ROLE MANAGEMENT =====
  
  async getUsersByRole(role: UserRole): Promise<User[]> {
    try {
      // ✅ CORREÇÃO: Converter UserRole para tipo compatível com schema
      const roleMap: Record<UserRole, SchemaUserType> = {
        'client': 'client',
        'driver': 'driver', 
        'admin': 'admin',
        'hotel_manager': 'host'
      };
      
      const schemaRole = roleMap[role] || 'client';
      
      const userList = await db
        .select()
        .from(users)
        .where(eq(users.userType, schemaRole));
      return userList.map(mapToUser);
    } catch (error) {
      console.error('Error fetching users by role:', error);
      return [];
    }
  }

  async updateUserRoles(userId: string, roles: UserRole[]): Promise<User> {
    try {
      const [user] = await db
        .update(users)
        .set({
          roles: roles,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();
      return mapToUser(user);
    } catch (error) {
      console.error('Error updating user roles:', error);
      throw new Error('Failed to update user roles');
    }
  }

  async addUserRole(userId: string, role: UserRole): Promise<User> {
    try {
      return await db.transaction(async (tx) => {
        const [user] = await tx
          .select()
          .from(users)
          .where(eq(users.id, userId));
        
        if (!user) throw new Error('User not found');
        
        const currentRoles = user.roles || [];
        if (!currentRoles.includes(role)) {
          const updatedRoles = [...currentRoles, role];
          const [updatedUser] = await tx
            .update(users)
            .set({
              roles: updatedRoles,
              updatedAt: new Date(),
            })
            .where(eq(users.id, userId))
            .returning();
          return mapToUser(updatedUser);
        }
        return mapToUser(user);
      });
    } catch (error) {
      console.error('Error adding user role:', error);
      throw new Error('Failed to add user role');
    }
  }

  async removeUserRole(userId: string, role: UserRole): Promise<User> {
    try {
      return await db.transaction(async (tx) => {
        const [user] = await tx
          .select()
          .from(users)
          .where(eq(users.id, userId));
        
        if (!user) throw new Error('User not found');
        
        const currentRoles = user.roles || [];
        const updatedRoles = currentRoles.filter(r => r !== role);
        
        const [updatedUser] = await tx
          .update(users)
          .set({
            roles: updatedRoles,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId))
          .returning();
        return mapToUser(updatedUser);
      });
    } catch (error) {
      console.error('Error removing user role:', error);
      throw new Error('Failed to remove user role');
    }
  }

  // ===== VERIFICATION =====
  
  async updateVerificationStatus(userId: string, status: VerificationStatus): Promise<User> {
    try {
      const [user] = await db
        .update(users)
        .set({
          verificationStatus: status,
          verificationDate: status === 'verified' ? new Date() : undefined,
          isVerified: status === 'verified',
          canOfferServices: status === 'verified',
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();
      return mapToUser(user);
    } catch (error) {
      console.error('Error updating verification status:', error);
      throw new Error('Failed to update verification status');
    }
  }

  async getUnverifiedUsers(): Promise<User[]> {
    try {
      const userList = await db
        .select()
        .from(users)
        .where(eq(users.isVerified, false));
      return userList.map(mapToUser);
    } catch (error) {
      console.error('Error fetching unverified users:', error);
      return [];
    }
  }

  async getPendingVerifications(): Promise<User[]> {
    try {
      const userList = await db
        .select()
        .from(users)
        .where(or(
          eq(users.verificationStatus, 'pending'),
          eq(users.verificationStatus, 'in_review')
        ));
      return userList.map(mapToUser);
    } catch (error) {
      console.error('Error fetching pending verifications:', error);
      return [];
    }
  }

  // ===== DRIVER-SPECIFIC OPERATIONS =====
  
  async updateDriverDocuments(driverId: string, documents: Partial<Omit<DriverDocuments, 'createdAt'>>): Promise<void> {
    try {
      // ✅ CORREÇÃO: Merge com documentos existentes para preservar campos não fornecidos
      const existingDocs = await this.getDriverDocuments(driverId);
      
      const mergedDocuments = {
        ...existingDocs,
        ...documents,
        driverId,
        updatedAt: new Date(),
      };

      await db
        .insert(driverDocuments)
        .values(mergedDocuments)
        .onConflictDoUpdate({
          target: driverDocuments.driverId,
          set: mergedDocuments,
        });
    } catch (error) {
      console.error('Error updating driver documents:', error);
      throw new Error('Failed to update driver documents');
    }
  }

  async getDriverDocuments(driverId: string): Promise<DriverDocuments | undefined> {
    try {
      const [docs] = await db
        .select()
        .from(driverDocuments)
        .where(eq(driverDocuments.driverId, driverId));
      return docs ? mapToDriverDocuments(docs) : undefined;
    } catch (error) {
      console.error('Error fetching driver documents:', error);
      return undefined;
    }
  }

  async getDriverStatistics(driverId: string): Promise<DriverStats> {
    try {
      // TODO: Implement when bookings table is properly set up
      return {
        totalRides: 0,
        completedRides: 0,
        totalEarnings: 0,
        averageRating: 0,
        totalReviews: 0,
      };
    } catch (error) {
      console.error('Error fetching driver statistics:', error);
      throw new Error('Failed to fetch driver statistics');
    }
  }

  // ===== SEARCH AND LISTING =====
  
  async searchUsers(query: string): Promise<User[]> {
    try {
      const queryPattern = `%${query}%`;
      
      const userList = await db
        .select()
        .from(users)
        .where(or(
          ilike(users.firstName, queryPattern),
          ilike(users.lastName, queryPattern),
          ilike(users.email, queryPattern),
          ilike(users.phone, queryPattern)
        ));
      
      return userList.map(mapToUser);
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }

  async getUsersWithPagination(page: number, limit: number): Promise<{ users: User[], total: number }> {
    try {
      const offset = (page - 1) * limit;
      
      // ✅ CORREÇÃO: Query otimizada com window function para contar total
      const result = await db
        .select({
          user: users,
          totalCount: sql<number>`count(*) over()`,
        })
        .from(users)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(users.createdAt));
      
      const userList = result.map(row => mapToUser(row.user));
      const total = result.length > 0 ? Number(result[0].totalCount) : 0;
      
      return {
        users: userList,
        total,
      };
    } catch (error) {
      console.error('Error fetching users with pagination:', error);
      return { users: [], total: 0 };
    }
  }

  // ===== ADDITIONAL METHODS FOR CONTROLLERS =====
  
  async upsertUser(userData: UpsertUserData): Promise<User> {
    try {
      // ✅ CORREÇÃO: Converter userType para tipo compatível com schema
      const userTypeMap: Record<string, SchemaUserType> = {
        'client': 'client',
        'driver': 'driver',
        'admin': 'admin',
        'hotel_manager': 'host'
      };
      
      const schemaUserType = userData.userType ? userTypeMap[userData.userType] || 'client' : 'client';

      // ✅ CORREÇÃO: Preparar dados para upsert
      const upsertData = {
        id: userData.id,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        fullName: userData.fullName,
        phone: userData.phone,
        userType: schemaUserType,
        roles: userData.roles || ['client'],
        canOfferServices: userData.canOfferServices ?? false,
        profileImageUrl: userData.profileImageUrl,
        updatedAt: new Date(),
      };

      // ✅ CORREÇÃO: Usando onConflictDoUpdate para upsert real
      const [user] = await db
        .insert(users)
        .values({
          ...upsertData,
          createdAt: new Date(),
        })
        .onConflictDoUpdate({
          target: users.id,
          set: upsertData,
        })
        .returning();
      return mapToUser(user);
    } catch (error) {
      console.error('Error upserting user:', error);
      throw new Error('Failed to upsert user');
    }
  }

  async getUsersByType(userType: SchemaUserType): Promise<User[]> {
    try {      
      const userList = await db
        .select()
        .from(users)
        .where(eq(users.userType, userType))
        .orderBy(desc(users.createdAt));
      
      return userList.map(mapToUser);
    } catch (error) {
      console.error('Error fetching users by type:', error);
      return [];
    }
  }
}

// Export singleton instance
export const authStorage = new DatabaseAuthStorage();