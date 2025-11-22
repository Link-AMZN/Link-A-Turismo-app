import { PartnershipRepository } from './partnershipRepository';
import { partnershipStorage } from '../../../storage/admin/PartnershipStorage';

export class PartnershipService {
  private partnershipRepository: PartnershipRepository;

  constructor() {
    this.partnershipRepository = new PartnershipRepository();
  }

  public async getAvailableProposals(province?: string) {
    return this.partnershipRepository.findAvailableProposals(province);
  }

  public async getDriverProposals(driverId: string) {
    return this.partnershipRepository.findProposalsByDriver(driverId);
  }

  public async getHotelProposals(hotelId: string) {
    return this.partnershipRepository.findProposalsByHotel(hotelId);
  }

  public async createProposal(hotelId: string, data: any) {
    const proposalData = {
      ...data,
      hotelId,
      status: 'active',
      createdAt: new Date(),
      currentApplicants: 0,
      province: data.province, // ✅ novo campo
      city: data.city,         // opcional
      offerFuel: data.offerFuel || false,
      offerMeals: data.offerMeals || false,
      offerFreeAccommodation: data.offerFreeAccommodation || false,
      premiumRate: data.premiumRate || 0,
      minimumDriverLevel: data.minimumDriverLevel || 'bronze',
      requiredVehicleType: data.requiredVehicleType || 'any',
    };

    return this.partnershipRepository.createProposal(proposalData);
  }

  public async acceptProposal(proposalId: string, driverId: string) {
    const proposal = await this.partnershipRepository.findProposalById(proposalId);
    
    if (!proposal || proposal.status !== 'active') {
      throw new Error('Proposta não disponível');
    }

    // Verificar se o motorista já aplicou
    const existingApplication = await this.partnershipRepository.findApplication(proposalId, driverId);
    if (existingApplication) {
      throw new Error('Você já aplicou a esta proposta');
    }

    // Criar aplicação
    const application = await this.partnershipRepository.createApplication(proposalId, driverId, {
      status: 'accepted',
      acceptedAt: new Date()
    });

    // Atualizar contador de aplicantes na proposta
    await this.partnershipRepository.updateProposal(proposalId, {
      currentApplicants: (proposal.currentApplicants || 0) + 1
    });

    // ✅ CORRIGIDO: Criar parceria no sistema existente com valores realistas
    // Calcular desconto baseado no tipo de proposta e benefícios oferecidos
    let discountRate = 10; // Desconto padrão de 10%
    
    // Aumentar desconto baseado nos benefícios da proposta
    if (proposal.offerFreeAccommodation) {
      discountRate += 15; // +15% se oferecer hospedagem gratuita
    }
    if (proposal.offerMeals) {
      discountRate += 5; // +5% se oferecer refeições
    }
    if (proposal.offerFuel) {
      discountRate += 8; // +8% se oferecer combustível
    }
    if (proposal.premiumRate && Number(proposal.premiumRate) > 0) {
      discountRate += Number(proposal.premiumRate); // Adicionar taxa premium
    }

    // Limitar a um máximo de 40% de desconto
    discountRate = Math.min(discountRate, 40);

    const partnership = await partnershipStorage.createPartnership({
      type: 'driver_accommodation',
      providerId: proposal.hotelId,
      partnerId: driverId,
      status: 'active',
      terms: {
        discountRate: discountRate, // ✅ Usar desconto calculado
        commissionRate: 5, // Comissão padrão de 5%
        minimumRequirements: {
          driverLevel: proposal.minimumDriverLevel || 'bronze',
          vehicleType: proposal.requiredVehicleType || 'any',
          description: `Parceria baseada na proposta: ${proposal.title}`
        },
        description: `Parceria baseada na proposta: ${proposal.title}`
      },
      metrics: {
        totalTransactions: 0,
        totalSavings: 0,
        totalCommissions: 0
      }
    });

    return { application, partnership };
  }

  public async rejectProposal(proposalId: string, driverId: string) {
    const proposal = await this.partnershipRepository.findProposalById(proposalId);
    
    if (!proposal) {
      throw new Error('Proposta não encontrada');
    }

    // Criar aplicação com status rejected
    const application = await this.partnershipRepository.createApplication(proposalId, driverId, {
      status: 'rejected'
    });

    return { message: 'Proposta rejeitada com sucesso', application };
  }

  // NOVO MÉTODO: Listar aplicações de um motorista
  public async getDriverApplications(driverId: string) {
    return this.partnershipRepository.getDriverApplications(driverId);
  }

  // NOVO MÉTODO: Listar aplicações de uma proposta
  public async getProposalApplications(proposalId: string) {
    return this.partnershipRepository.getProposalApplications(proposalId);
  }

  // NOVO MÉTODO: Buscar proposta por ID (necessário para o controller)
  public async findProposalById(proposalId: string) {
    return this.partnershipRepository.findProposalById(proposalId);
  }

  // NOVO MÉTODO: Atualizar status de uma aplicação (útil para admin/hotel)
  public async updateApplicationStatus(applicationId: string, status: string) {
    const updateData: any = { status };
    
    if (status === 'accepted') {
      updateData.acceptedAt = new Date();
    } else if (status === 'completed') {
      updateData.completedAt = new Date();
    }

    return this.partnershipRepository.updateApplication(applicationId, updateData);
  }

  // NOVO MÉTODO: Buscar aplicação por ID
  public async findApplicationById(applicationId: string) {
    throw new Error('Método findApplicationById não implementado no Repository');
  }

  // NOVO MÉTODO: Verificar se motorista já aplicou a uma proposta
  public async hasDriverApplied(proposalId: string, driverId: string) {
    const application = await this.partnershipRepository.findApplication(proposalId, driverId);
    return !!application;
  }
}