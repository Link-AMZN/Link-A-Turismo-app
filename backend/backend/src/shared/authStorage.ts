import {
  users,
} from "@shared/schema";
import { db } from "../../db";
import { eq } from "drizzle-orm";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

// Use os tipos inferidos do Drizzle ORM
type User = InferSelectModel<typeof users>;
type UpsertUser = InferInsertModel<typeof users>;

// DTO para criação de usuário
export interface CreateUserData {
  id: string; // Firebase UID
  email?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  profileImageUrl?: string;
  phone?: string;
  userType?: 'client' | 'driver' | 'host' | 'admin';
  roles?: string[];
  canOfferServices?: boolean;
}

// Interface for authentication storage operations
export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  createUser(userData: CreateUserData): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
}

// Função para mapear dados do banco para User
function mapDbUserToUser(dbUser: any): User {
  return {
    ...dbUser,
    // Garantir que campos numéricos sejam numbers
    rating: dbUser.rating ? Number(dbUser.rating) : 0,
    totalReviews: dbUser.totalReviews ? Number(dbUser.totalReviews) : 0,
    
    // Garantir que booleanos sejam booleanos
    isVerified: Boolean(dbUser.isVerified),
    canOfferServices: Boolean(dbUser.canOfferServices),
    registrationCompleted: Boolean(dbUser.registrationCompleted),
    
    // Garantir que arrays sejam arrays
    roles: Array.isArray(dbUser.roles) ? dbUser.roles : [],
    
    // Garantir que datas sejam Date objects
    createdAt: dbUser.createdAt ? new Date(dbUser.createdAt) : new Date(),
    updatedAt: dbUser.updatedAt ? new Date(dbUser.updatedAt) : new Date(),
    verificationDate: dbUser.verificationDate ? new Date(dbUser.verificationDate) : null,
    badgeEarnedDate: dbUser.badgeEarnedDate ? new Date(dbUser.badgeEarnedDate) : null,
    dateOfBirth: dbUser.dateOfBirth ? new Date(dbUser.dateOfBirth) : null,
    
    // Garantir valores padrão para campos opcionais
    email: dbUser.email || '',
    phone: dbUser.phone || '',
    firstName: dbUser.firstName || '',
    lastName: dbUser.lastName || '',
    fullName: dbUser.fullName || '',
    profileImageUrl: dbUser.profileImageUrl || '',
    userType: dbUser.userType || 'client',
    verificationStatus: dbUser.verificationStatus || 'pending',
    verificationNotes: dbUser.verificationNotes || '',
    identityDocumentUrl: dbUser.identityDocumentUrl || '',
    identityDocumentType: dbUser.identityDocumentType || '',
    documentNumber: dbUser.documentNumber || '',
    verificationBadge: dbUser.verificationBadge || '',
  } as User;
}

// Função para preparar dados para upsert
function prepareUpsertData(userData: UpsertUser): any {
  const now = new Date();
  
  return {
    ...userData,
    // Garantir valores padrão para campos obrigatórios
    userType: userData.userType || 'client',
    roles: userData.roles || ['client'],
    canOfferServices: userData.canOfferServices ?? false,
    isVerified: userData.isVerified ?? false,
    registrationCompleted: userData.registrationCompleted ?? false,
    rating: userData.rating ? userData.rating.toString() : '0.00',
    totalReviews: userData.totalReviews || 0,
    verificationStatus: userData.verificationStatus || 'pending',
    
    // Atualizar timestamp
    updatedAt: now,
    
    // Se for criação, definir createdAt
    ...(userData.id && !userData.createdAt && { createdAt: now }),
  };
}

export class DatabaseAuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user ? mapDbUserToUser(user) : undefined;
    } catch (error) {
      console.error('Error fetching user:', error);
      return undefined;
    }
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    try {
      // ✅ CORREÇÃO: Usando id field como Firebase UID (conforme schema atual)
      const [user] = await db.select().from(users).where(eq(users.id, firebaseUid));
      return user ? mapDbUserToUser(user) : undefined;
    } catch (error) {
      console.error('Error fetching user by Firebase UID:', error);
      return undefined;
    }
  }

  async createUser(userData: CreateUserData): Promise<User> {
    try {
      const userValues = {
        ...userData,
        // ✅ CORREÇÃO: Campos obrigatórios com valores padrão
        userType: userData.userType || 'client',
        roles: userData.roles || ['client'],
        canOfferServices: userData.canOfferServices ?? false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const [user] = await db
        .insert(users)
        .values(userValues)
        .returning();
      
      return mapDbUserToUser(user);
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    try {
      const preparedData = prepareUpsertData(userData);
      
      const [user] = await db
        .insert(users)
        .values(preparedData)
        .onConflictDoUpdate({
          target: users.id,
          set: {
            ...preparedData,
            // Não sobrescrever createdAt em updates
            createdAt: undefined,
          },
        })
        .returning();
      
      return mapDbUserToUser(user);
    } catch (error) {
      console.error('Error upserting user:', error);
      throw new Error('Failed to upsert user');
    }
  }
}

export const authStorage = new DatabaseAuthStorage();