#!/bin/bash
echo "📋 GERANDO SQL CORRIGIDO COM TODOS OS DADOS..."

# Distritos
echo "-- ==========================================" > dados_corrigidos.sql
echo "-- 🗺️  TODOS OS DISTRITOS DE MOÇAMBIQUE (159 distritos)" >> dados_corrigidos.sql
echo "-- ==========================================" >> dados_corrigidos.sql
echo "INSERT INTO mozambique_locations (name, province, district, type, lat, lng) VALUES" >> dados_corrigidos.sql

sqlite3 mozambique_data.sqlite "SELECT adm2_pt, adm1_pt FROM moz_admbnda_adm2_ine_20190607 ORDER BY adm1_pt, adm2_pt;" | \
awk -F'|' '{printf "('\''%s'\'', '\''%s'\'', '\''%s'\'', '\''district'\'', 0.0, 0.0),\n", $1, $2, $1}' >> dados_corrigidos.sql

# Remover última vírgula dos distritos e adicionar ON CONFLICT
sed -i '$ s/,$//' dados_corrigidos.sql
echo "ON CONFLICT DO NOTHING;" >> dados_corrigidos.sql

# Bairros
echo "" >> dados_corrigidos.sql
echo "-- ==========================================" >> dados_corrigidos.sql
echo "-- 🏘️  TODOS OS BAIRROS/LOCALIDADES (411 localidades)" >> dados_corrigidos.sql
echo "-- ==========================================" >> dados_corrigidos.sql
echo "INSERT INTO mozambique_locations (name, province, district, type, lat, lng) VALUES" >> dados_corrigidos.sql

sqlite3 mozambique_data.sqlite "SELECT adm3_pt, adm1_pt, adm2_pt FROM moz_admbnda_adm3_ine_20190607 ORDER BY adm1_pt, adm2_pt, adm3_pt;" | \
awk -F'|' '{printf "('\''%s'\'', '\''%s'\'', '\''%s'\'', '\''neighbourhood'\'', 0.0, 0.0),\n", $1, $2, $3}' >> dados_corrigidos.sql

# Remover última vírgula dos bairros e adicionar ON CONFLICT
sed -i '$ s/,$//' dados_corrigidos.sql
echo "ON CONFLICT DO NOTHING;" >> dados_corrigidos.sql

echo "✅ SQL corrigido gerado em 'dados_corrigidos.sql'"
