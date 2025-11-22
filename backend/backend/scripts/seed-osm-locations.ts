import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

// Configuração do db
const connectionString = process.env.DATABASE_URL || 'postgresql://linka_user:@localhost:5432/linka2_database';
const client = postgres(connectionString);
const db = drizzle(client);

async function seedOSMLocations() {
  console.log('🌍 Populando tabela mozambique_locations com dados do OSM...');

  try {
    // Primeiro limpa a tabela existente
    await db.execute(sql`DELETE FROM mozambique_locations`);
    console.log('✅ Tabela limpa');

    // Tenta inserir dados do OSM
    console.log('🔄 Tentando inserir dados do OSM...');
    
    // Para a versão mais recente do Drizzle, usamos array diretamente
    const osmResult = await db.execute(sql`
      INSERT INTO mozambique_locations (name, province, district, lat, lng, type)
      SELECT
        p.name,
        admin4.name AS province,
        admin6.name AS district,
        ST_Y(ST_Transform(p.way, 4326))::numeric(10,7) AS lat,
        ST_X(ST_Transform(p.way, 4326))::numeric(10,7) AS lng,
        p.place::text AS type
      FROM planet_osm_point p
      LEFT JOIN planet_osm_polygon admin4
        ON admin4.boundary = 'administrative'
       AND (admin4.admin_level = '4' OR admin4.admin_level = '2')
       AND ST_Contains(admin4.way, p.way)
      LEFT JOIN planet_osm_polygon admin6
        ON admin6.boundary = 'administrative'
       AND admin6.admin_level = '6'
       AND ST_Contains(admin6.way, p.way)
      WHERE p.place IN ('city','town','village') 
        AND p.name IS NOT NULL
      RETURNING id
    `);

    // Na versão atual do Drizzle, o resultado é um array
    const rowCount = Array.isArray(osmResult) ? osmResult.length : 0;
    console.log(`✅ ${rowCount} localidades inseridas do OSM`);
    
  } catch (error: any) {
    console.error('❌ Erro no seed do OSM:', error.message);
    
    // Se der erro de tabelas OSM, vamos inserir dados de exemplo
    console.log('🔄 Inserindo dados de exemplo...');
    
    const exampleResult = await db.execute(sql`
      INSERT INTO mozambique_locations (name, province, district, lat, lng, type) VALUES
      ('Maputo', 'Maputo', 'KaMpfumo', -25.969248, 32.573174, 'city'),
      ('Matola', 'Maputo', 'Matola', -25.962342, 32.458895, 'city'),
      ('Xai-Xai', 'Gaza', 'Xai-Xai', -25.051944, 33.644167, 'city'),
      ('Inhambane', 'Inhambane', 'Inhambane', -23.865000, 35.383333, 'city'),
      ('Beira', 'Sofala', 'Beira', -19.833333, 34.850000, 'city'),
      ('Nampula', 'Nampula', 'Nampula', -15.116667, 39.266667, 'city'),
      ('Lichinga', 'Niassa', 'Lichinga', -13.312778, 35.240556, 'city'),
      ('Pemba', 'Cabo Delgado', 'Pemba', -12.966667, 40.516667, 'city'),
      ('Quelimane', 'Zambézia', 'Quelimane', -17.876389, 36.887222, 'city'),
      ('Tete', 'Tete', 'Tete', -16.156389, 33.586667, 'city'),
      ('Chimoio', 'Manica', 'Chimoio', -19.116389, 33.483333, 'city'),
      ('Maxixe', 'Inhambane', 'Maxixe', -23.859722, 35.347222, 'city'),
      ('Angoche', 'Nampula', 'Angoche', -16.233333, 39.908333, 'town'),
      ('Montepuez', 'Cabo Delgado', 'Montepuez', -13.125556, 38.999722, 'town'),
      ('Dondo', 'Sofala', 'Dondo', -19.609444, 34.743056, 'town')
      RETURNING id
    `);

    const exampleCount = Array.isArray(exampleResult) ? exampleResult.length : 0;
    console.log(`✅ ${exampleCount} dados de exemplo inseridos`);
  }
}

// Versão alternativa mais segura para contar rows
async function seedOSMLocationsAlternative() {
  console.log('🌍 Populando tabela mozambique_locations...');

  try {
    // Primeiro limpa a tabela existente
    await db.execute(sql`DELETE FROM mozambique_locations`);
    console.log('✅ Tabela limpa');

    // Tenta contar se existem dados OSM
    const osmCheck = await db.execute(sql`
      SELECT COUNT(*) as count FROM planet_osm_point 
      WHERE place IN ('city','town','village') AND name IS NOT NULL
    `);
    
    const osmCount = Array.isArray(osmCheck) && osmCheck[0] ? (osmCheck[0] as any).count : 0;
    
    if (osmCount > 0) {
      console.log(`🔄 Encontrados ${osmCount} localidades no OSM, inserindo...`);
      
      await db.execute(sql`
        INSERT INTO mozambique_locations (name, province, district, lat, lng, type)
        SELECT
          p.name,
          COALESCE(admin4.name, admin2.name) AS province,
          admin6.name AS district,
          ST_Y(ST_Transform(p.way, 4326))::numeric(10,7) AS lat,
          ST_X(ST_Transform(p.way, 4326))::numeric(10,7) AS lng,
          p.place::text AS type
        FROM planet_osm_point p
        LEFT JOIN planet_osm_polygon admin4
          ON admin4.boundary = 'administrative' AND admin4.admin_level = '4'
         AND ST_Contains(admin4.way, p.way)
        LEFT JOIN planet_osm_polygon admin2
          ON admin2.boundary = 'administrative' AND admin2.admin_level = '2'
         AND ST_Contains(admin2.way, p.way)
        LEFT JOIN planet_osm_polygon admin6
          ON admin6.boundary = 'administrative' AND admin6.admin_level = '6'
         AND ST_Contains(admin6.way, p.way)
        WHERE p.place IN ('city','town','village') 
          AND p.name IS NOT NULL
      `);
      
      // Conta quantos foram inseridos
      const countResult = await db.execute(sql`SELECT COUNT(*) as count FROM mozambique_locations`);
      const finalCount = Array.isArray(countResult) && countResult[0] ? (countResult[0] as any).count : 0;
      
      console.log(`✅ ${finalCount} localidades inseridas do OSM`);
    } else {
      throw new Error('Nenhum dado OSM encontrado');
    }
    
  } catch (error: any) {
    console.error('❌ Erro no seed do OSM:', error.message);
    console.log('🔄 Inserindo dados de exemplo...');
    
    await db.execute(sql`
      INSERT INTO mozambique_locations (name, province, district, lat, lng, type) VALUES
      ('Maputo', 'Maputo', 'KaMpfumo', -25.969248, 32.573174, 'city'),
      ('Matola', 'Maputo', 'Matola', -25.962342, 32.458895, 'city'),
      ('Xai-Xai', 'Gaza', 'Xai-Xai', -25.051944, 33.644167, 'city'),
      ('Inhambane', 'Inhambane', 'Inhambane', -23.865000, 35.383333, 'city'),
      ('Beira', 'Sofala', 'Beira', -19.833333, 34.850000, 'city'),
      ('Nampula', 'Nampula', 'Nampula', -15.116667, 39.266667, 'city'),
      ('Lichinga', 'Niassa', 'Lichinga', -13.312778, 35.240556, 'city'),
      ('Pemba', 'Cabo Delgado', 'Pemba', -12.966667, 40.516667, 'city'),
      ('Quelimane', 'Zambézia', 'Quelimane', -17.876389, 36.887222, 'city'),
      ('Tete', 'Tete', 'Tete', -16.156389, 33.586667, 'city'),
      ('Chimoio', 'Manica', 'Chimoio', -19.116389, 33.483333, 'city'),
      ('Maxixe', 'Inhambane', 'Maxixe', -23.859722, 35.347222, 'city'),
      ('Angoche', 'Nampula', 'Angoche', -16.233333, 39.908333, 'town'),
      ('Montepuez', 'Cabo Delgado', 'Montepuez', -13.125556, 38.999722, 'town'),
      ('Dondo', 'Sofala', 'Dondo', -19.609444, 34.743056, 'town')
    `);
    
    const countResult = await db.execute(sql`SELECT COUNT(*) as count FROM mozambique_locations`);
    const finalCount = Array.isArray(countResult) && countResult[0] ? (countResult[0] as any).count : 0;
    
    console.log(`✅ ${finalCount} dados de exemplo inseridos`);
  }
}

// Use a versão alternativa que é mais robusta
seedOSMLocationsAlternative()
  .then(() => {
    console.log('🎉 Seed concluído com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Erro fatal no seed:', error);
    process.exit(1);
  });