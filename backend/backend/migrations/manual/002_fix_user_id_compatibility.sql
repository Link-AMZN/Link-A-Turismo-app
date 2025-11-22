-- Migration: Corrigir compatibilidade de IDs do Firebase
-- Altera users.id e todas as foreign keys de UUID para TEXT

-- 1. Dropar todas as foreign keys que referenciam users.id
DO $$ 
DECLARE 
  fk_record RECORD;
BEGIN
  FOR fk_record IN 
    SELECT conname, conrelid::regclass as table_name
    FROM pg_constraint 
    WHERE confrelid = 'users'::regclass 
    AND contype = 'f'
  LOOP
    EXECUTE 'ALTER TABLE ' || fk_record.table_name || ' DROP CONSTRAINT ' || fk_record.conname;
  END LOOP;
END $$;

-- 2. Alterar tipo da coluna id na tabela users para TEXT
ALTER TABLE users ALTER COLUMN id TYPE TEXT;
ALTER TABLE users ALTER COLUMN id DROP DEFAULT;

-- 3. Alterar todas as colunas que referenciam users.id para TEXT
ALTER TABLE accommodations ALTER COLUMN "hostId" TYPE TEXT;
ALTER TABLE rides ALTER COLUMN "driverId" TYPE TEXT;
ALTER TABLE bookings ALTER COLUMN "passengerId" TYPE TEXT;
ALTER TABLE payments ALTER COLUMN "userId" TYPE TEXT;
ALTER TABLE ratings ALTER COLUMN "fromUserId" TYPE TEXT;
ALTER TABLE ratings ALTER COLUMN "toUserId" TYPE TEXT;
ALTER TABLE "chatRooms" ALTER COLUMN "participantOneId" TYPE TEXT;
ALTER TABLE "chatRooms" ALTER COLUMN "participantTwoId" TYPE TEXT;
ALTER TABLE "chatMessages" ALTER COLUMN "fromUserId" TYPE TEXT;
ALTER TABLE "chatMessages" ALTER COLUMN "toUserId" TYPE TEXT;
ALTER TABLE "partnershipApplications" ALTER COLUMN "driverId" TYPE TEXT;
ALTER TABLE "adminActions" ALTER COLUMN "adminId" TYPE TEXT;
ALTER TABLE "adminActions" ALTER COLUMN "targetUserId" TYPE TEXT;
ALTER TABLE "priceNegotiations" ALTER COLUMN "passengerId" TYPE TEXT;
ALTER TABLE "priceNegotiations" ALTER COLUMN "driverId" TYPE TEXT;
ALTER TABLE "pickupRequests" ALTER COLUMN "passengerId" TYPE TEXT;
ALTER TABLE "pickupRequests" ALTER COLUMN "driverId" TYPE TEXT;
ALTER TABLE "driverStats" ALTER COLUMN "driverId" TYPE TEXT;
ALTER TABLE "driverDocuments" ALTER COLUMN "driverId" TYPE TEXT;
ALTER TABLE "eventManagers" ALTER COLUMN "userId" TYPE TEXT;
ALTER TABLE events ALTER COLUMN "organizerId" TYPE TEXT;
ALTER TABLE "loyaltyProgram" ALTER COLUMN "userId" TYPE TEXT;
ALTER TABLE "pointsHistory" ALTER COLUMN "userId" TYPE TEXT;
ALTER TABLE "rewardRedemptions" ALTER COLUMN "userId" TYPE TEXT;
ALTER TABLE notifications ALTER COLUMN "userId" TYPE TEXT;

-- 4. Recriar as foreign keys
ALTER TABLE accommodations ADD CONSTRAINT "accommodations_hostId_users_id_fk" FOREIGN KEY ("hostId") REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE rides ADD CONSTRAINT "rides_driverId_users_id_fk" FOREIGN KEY ("driverId") REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE bookings ADD CONSTRAINT "bookings_passengerId_users_id_fk" FOREIGN KEY ("passengerId") REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE payments ADD CONSTRAINT "payments_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE ratings ADD CONSTRAINT "ratings_fromUserId_users_id_fk" FOREIGN KEY ("fromUserId") REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE ratings ADD CONSTRAINT "ratings_toUserId_users_id_fk" FOREIGN KEY ("toUserId") REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE "chatRooms" ADD CONSTRAINT "chatRooms_participantOneId_users_id_fk" FOREIGN KEY ("participantOneId") REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE "chatRooms" ADD CONSTRAINT "chatRooms_participantTwoId_users_id_fk" FOREIGN KEY ("participantTwoId") REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE "chatMessages" ADD CONSTRAINT "chatMessages_fromUserId_users_id_fk" FOREIGN KEY ("fromUserId") REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE "chatMessages" ADD CONSTRAINT "chatMessages_toUserId_users_id_fk" FOREIGN KEY ("toUserId") REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE "partnershipApplications" ADD CONSTRAINT "partnershipApplications_driverId_users_id_fk" FOREIGN KEY ("driverId") REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE "adminActions" ADD CONSTRAINT "adminActions_adminId_users_id_fk" FOREIGN KEY ("adminId") REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE "adminActions" ADD CONSTRAINT "adminActions_targetUserId_users_id_fk" FOREIGN KEY ("targetUserId") REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE "priceNegotiations" ADD CONSTRAINT "priceNegotiations_passengerId_users_id_fk" FOREIGN KEY ("passengerId") REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE "priceNegotiations" ADD CONSTRAINT "priceNegotiations_driverId_users_id_fk" FOREIGN KEY ("driverId") REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE "pickupRequests" ADD CONSTRAINT "pickupRequests_passengerId_users_id_fk" FOREIGN KEY ("passengerId") REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE "pickupRequests" ADD CONSTRAINT "pickupRequests_driverId_users_id_fk" FOREIGN KEY ("driverId") REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE "driverStats" ADD CONSTRAINT "driverStats_driverId_users_id_fk" FOREIGN KEY ("driverId") REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE "driverDocuments" ADD CONSTRAINT "driverDocuments_driverId_users_id_fk" FOREIGN KEY ("driverId") REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE "eventManagers" ADD CONSTRAINT "eventManagers_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE events ADD CONSTRAINT "events_organizerId_users_id_fk" FOREIGN KEY ("organizerId") REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE "loyaltyProgram" ADD CONSTRAINT "loyaltyProgram_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE "pointsHistory" ADD CONSTRAINT "pointsHistory_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE "rewardRedemptions" ADD CONSTRAINT "rewardRedemptions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD CONSTRAINT "notifications_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;

-- 5. Atualizar comentário da tabela
COMMENT ON TABLE users IS 'Users table with Firebase-compatible TEXT IDs';
