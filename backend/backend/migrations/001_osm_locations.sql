-- Migration para atualizar tabela mozambique_locations para dados OSM

-- Remove colunas desnecessárias
ALTER TABLE mozambique_locations 
DROP COLUMN IF EXISTS population,
DROP COLUMN IF EXISTS tourism_interest,
DROP COLUMN IF EXISTS search_priority;

-- Altera a coluna type para varchar (remove o enum antigo)
ALTER TABLE mozambique_locations 
ALTER COLUMN type TYPE varchar(20);

-- Torna province opcional (se ainda não for)
ALTER TABLE mozambique_locations 
ALTER COLUMN province DROP NOT NULL;

-- Adiciona comentários para documentação
COMMENT ON TABLE mozambique_locations IS 'Localidades de Moçambique extraídas do OpenStreetMap (city/town/village)';
COMMENT ON COLUMN mozambique_locations.type IS 'Tipo de localidade do OSM: city, town, village';