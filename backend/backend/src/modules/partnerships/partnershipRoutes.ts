import { Router } from 'express';
import { PartnershipController } from './partnershipController';
import { authenticate } from '../../../middleware/role-auth';

const router = Router();
const partnershipController = new PartnershipController();

// ===== ROTAS PÚBLICAS (para motoristas e usuários não autenticados) =====

// Buscar propostas disponíveis (com filtros opcionais)
router.get('/proposals/available', partnershipController.getAvailableProposals);

// ===== ROTAS PARA MOTORISTAS =====

// Listar propostas do motorista
router.get('/my-proposals', authenticate('driver'), partnershipController.getMyProposals);

// Listar aplicações do motorista
router.get('/my-applications', authenticate('driver'), partnershipController.getMyApplications);

// Aplicar a uma proposta (aceitar)
router.post('/proposals/:proposalId/accept', authenticate('driver'), partnershipController.acceptProposal);

// Rejeitar uma proposta
router.post('/proposals/:proposalId/reject', authenticate('driver'), partnershipController.rejectProposal);

// ===== ROTAS PARA HOTÉIS =====

// Gestão de propostas
router.post('/proposals', authenticate('hotel_manager'), partnershipController.createProposal);
router.get('/proposals', authenticate('hotel_manager'), partnershipController.getHotelProposals);

// Gestão de aplicações
router.get('/proposals/:proposalId/applications', authenticate('hotel_manager'), partnershipController.getProposalApplications);

export { router as partnershipRoutes };