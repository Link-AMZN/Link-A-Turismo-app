#!/bin/bash
echo "📋 GERANDO SQL COM TODOS OS DADOS OFICIAIS..."

echo "-- =========================================="
echo "-- 🗺️  TODOS OS DISTRITOS DE MOÇAMBIQUE (Nível 2)"
echo "-- =========================================="
echo "INSERT INTO mozambique_locations (name, province, district, type, lat, lng) VALUES"
# Extrair todos os distritos
sqlite3 mozambique_data.sqlite "SELECT adm2_pt, adm1_pt FROM moz_admbnda_adm2_ine_20190607 ORDER BY adm1_pt, adm2_pt;" | \
awk -F'|' '{printf "('\''%s'\'', '\''%s'\'', '\''%s'\'', '\''district'\'', 0.0, 0.0),\n", $1, $2, $1}'

echo ""
echo "-- =========================================="
echo "-- 🏘️  TODOS OS BAIRROS/LOCALIDADES (Nível 3)"
echo "-- =========================================="
echo "INSERT INTO mozambique_locations (name, province, district, type, lat, lng) VALUES"

# Extrair todos os bairros/localidades
sqlite3 mozambique_data.sqlite "SELECT adm3_pt, adm1_pt, adm2_pt FROM moz_admbnda_adm3_ine_20190607 ORDER BY adm1_pt, adm2_pt, adm3_pt;" | \
awk -F'|' '{printf "('\''%s'\'', '\''%s'\'', '\''%s'\'', '\''neighbourhood'\'', 0.0, 0.0),\n", $1, $2, $3}'
