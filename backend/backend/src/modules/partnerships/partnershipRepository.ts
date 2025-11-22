import { db } from '../../../db';
import { partnershipProposals, partnershipApplications } from '../../../shared/schema';
import { sql, eq, and, gt, desc } from 'drizzle-orm'; // ✅ Importação correta

export class PartnershipRepository {
  async findAvailableProposals(province?: string) {
    const conditions = [
      eq(partnershipProposals.status, 'active'),
      gt(partnershipProposals.endDate, new Date())
    ];

    if (province) {
      conditions.push(eq(partnershipProposals.province, province));
    }

    return db
      .select()
      .from(partnershipProposals)
      .where(and(...conditions))
      .orderBy(desc(partnershipProposals.createdAt));
  }

  async findProposalsByDriver(driverId: string) {
    return db
      .select({
        proposal: partnershipProposals,
        application: partnershipApplications
      })
      .from(partnershipApplications)
      .innerJoin(partnershipProposals, eq(partnershipApplications.proposalId, partnershipProposals.id))
      .where(eq(partnershipApplications.driverId, driverId))
      .orderBy(desc(partnershipApplications.applicationDate));
  }

  async findProposalsByHotel(hotelId: string) {
    return db
      .select()
      .from(partnershipProposals)
      .where(eq(partnershipProposals.hotelId, hotelId))
      .orderBy(desc(partnershipProposals.createdAt));
  }

  async createProposal(data: any) {
    const [proposal] = await db
      .insert(partnershipProposals)
      .values(data)
      .returning();
    return proposal;
  }

  async updateProposal(id: string, data: any) {
    const [proposal] = await db
      .update(partnershipProposals)
      .set(data)
      .where(eq(partnershipProposals.id, id))
      .returning();
    return proposal;
  }

  async findProposalById(id: string) {
    const [proposal] = await db
      .select()
      .from(partnershipProposals)
      .where(eq(partnershipProposals.id, id));
    return proposal;
  }

  // NOVOS MÉTODOS PARA A TABELA DE JUNÇÃO
  async createApplication(proposalId: string, driverId: string, data: any = {}) {
    const [application] = await db
      .insert(partnershipApplications)
      .values({
        proposalId,
        driverId,
        ...data
      })
      .returning();
    return application;
  }

  async findApplication(proposalId: string, driverId: string) {
    const [application] = await db
      .select()
      .from(partnershipApplications)
      .where(
        and(
          eq(partnershipApplications.proposalId, proposalId),
          eq(partnershipApplications.driverId, driverId)
        )
      );
    return application;
  }

  async updateApplication(applicationId: string, data: any) {
    const [application] = await db
      .update(partnershipApplications)
      .set(data)
      .where(eq(partnershipApplications.id, applicationId))
      .returning();
    return application;
  }

  async getProposalApplications(proposalId: string) {
    return db
      .select()
      .from(partnershipApplications)
      .where(eq(partnershipApplications.proposalId, proposalId))
      .orderBy(desc(partnershipApplications.applicationDate));
  }

  async getDriverApplications(driverId: string) {
    return db
      .select()
      .from(partnershipApplications)
      .where(eq(partnershipApplications.driverId, driverId))
      .orderBy(desc(partnershipApplications.applicationDate));
  }

  // NOVO MÉTODO: Buscar aplicação por ID
  async findApplicationById(applicationId: string) {
    const [application] = await db
      .select()
      .from(partnershipApplications)
      .where(eq(partnershipApplications.id, applicationId));
    return application;
  }

  // NOVO MÉTODO: Buscar aplicações com status específico
  async findApplicationsByStatus(status: string) {
    return db
      .select()
      .from(partnershipApplications)
      .where(eq(partnershipApplications.status, status))
      .orderBy(desc(partnershipApplications.applicationDate));
  }

  // NOVO MÉTODO: Buscar aplicações de um motorista com status específico
  async findDriverApplicationsByStatus(driverId: string, status: string) {
    return db
      .select()
      .from(partnershipApplications)
      .where(
        and(
          eq(partnershipApplications.driverId, driverId),
          eq(partnershipApplications.status, status)
        )
      )
      .orderBy(desc(partnershipApplications.applicationDate));
  }

  // NOVO MÉTODO: Buscar aplicações de uma proposta com status específico
  async findProposalApplicationsByStatus(proposalId: string, status: string) {
    return db
      .select()
      .from(partnershipApplications)
      .where(
        and(
          eq(partnershipApplications.proposalId, proposalId),
          eq(partnershipApplications.status, status)
        )
      )
      .orderBy(desc(partnershipApplications.applicationDate));
  }

  // NOVO MÉTODO: Contar número de aplicações por proposta (SIMPLIFICADO)
  async countProposalApplications(proposalId: string) {
    const result = await db
      .select()
      .from(partnershipApplications)
      .where(eq(partnershipApplications.proposalId, proposalId));
    
    return result.length; // ✅ Corrigido: usando length em vez de count()
  }

  // NOVO MÉTODO: Contar número de aplicações por status (SIMPLIFICADO)
  async countApplicationsByStatus(proposalId: string, status: string) {
    const result = await db
      .select()
      .from(partnershipApplications)
      .where(
        and(
          eq(partnershipApplications.proposalId, proposalId),
          eq(partnershipApplications.status, status)
        )
      );
    
    return result.length; // ✅ Corrigido: usando length em vez de count()
  }
}