import { Request, Response } from 'express';
import { PartnershipService } from './partnershipService';

export class PartnershipController {
  private partnershipService: PartnershipService;

  constructor() {
    this.partnershipService = new PartnershipService();
  }

  // ✅ Helper privado para obter userId de forma consistente
  private getUserId(req: Request): string | null {
    const userId = Array.isArray(req.headers['user-id']) 
      ? req.headers['user-id'][0] 
      : req.headers['user-id'] || req.query.userId;
    return userId ? String(userId) : null;
  }

  // ✅ Helper privado para tratamento de erros consistente
  private handleError(error: unknown, res: Response): void {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: message });
  }

  public getAvailableProposals = async (req: Request, res: Response): Promise<void> => {
    try {
      const province = req.query.province as string | undefined;
      const proposals = await this.partnershipService.getAvailableProposals(province);
      res.json(proposals);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  public getMyProposals = async (req: Request, res: Response): Promise<void> => {
    try {
      const driverId = this.getUserId(req);
      if (!driverId) {
        res.status(401).json({ error: 'ID do usuário não fornecido' });
        return;
      }
      const proposals = await this.partnershipService.getDriverProposals(driverId);
      res.json(proposals);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  public getMyApplications = async (req: Request, res: Response): Promise<void> => {
    try {
      const driverId = this.getUserId(req);
      if (!driverId) {
        res.status(401).json({ error: 'ID do usuário não fornecido' });
        return;
      }
      const applications = await this.partnershipService.getDriverApplications(driverId);
      res.json(applications);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  public acceptProposal = async (req: Request, res: Response): Promise<void> => {
    try {
      const { proposalId } = req.params;
      const driverId = this.getUserId(req);

      if (!driverId) {
        res.status(401).json({ error: 'ID do usuário não fornecido' });
        return;
      }

      const agreement = await this.partnershipService.acceptProposal(proposalId, driverId);
      res.json(agreement);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  public rejectProposal = async (req: Request, res: Response): Promise<void> => {
    try {
      const { proposalId } = req.params;
      const driverId = this.getUserId(req);

      if (!driverId) {
        res.status(401).json({ error: 'ID do usuário não fornecido' });
        return;
      }

      const result = await this.partnershipService.rejectProposal(proposalId, driverId);
      res.json(result);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  public createProposal = async (req: Request, res: Response): Promise<void> => {
    try {
      const hotelId = this.getUserId(req);
      if (!hotelId) {
        res.status(401).json({ error: 'ID do usuário não fornecido' });
        return;
      }

      // ✅ Validação básica do body (pode ser expandida com Zod)
      if (!req.body.title || !req.body.description) {
        res.status(400).json({ error: 'Título e descrição são obrigatórios' });
        return;
      }

      const proposal = await this.partnershipService.createProposal(hotelId, req.body);
      res.status(201).json(proposal);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  public getHotelProposals = async (req: Request, res: Response): Promise<void> => {
    try {
      const hotelId = this.getUserId(req);
      if (!hotelId) {
        res.status(401).json({ error: 'ID do usuário não fornecido' });
        return;
      }

      const proposals = await this.partnershipService.getHotelProposals(hotelId);
      res.json(proposals);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  public getProposalApplications = async (req: Request, res: Response): Promise<void> => {
    try {
      const { proposalId } = req.params;
      const hotelId = this.getUserId(req);

      if (!hotelId) {
        res.status(401).json({ error: 'ID do usuário não fornecido' });
        return;
      }

      // Verificar se a proposta pertence ao hotel
      const proposal = await this.partnershipService.findProposalById(proposalId);
      if (!proposal || proposal.hotelId !== hotelId) {
        res.status(403).json({ error: 'Acesso não autorizado' });
        return;
      }

      const applications = await this.partnershipService.getProposalApplications(proposalId);
      res.json(applications);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // ✅ Método privado removido pois não estava sendo usado
  // (já estávamos chamando this.partnershipService.findProposalById diretamente)
}