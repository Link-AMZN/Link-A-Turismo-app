import { Router } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';

const router = Router();

// GET /api/locations/autocomplete?q=mapu&limit=5 - Otimizado para autocomplete
router.get('/autocomplete', async (req, res) => {
  try {
    const q = (req.query.q as string || "").trim();
    const limit = Math.min(parseInt((req.query.limit as string) || "8", 10), 20);

    if (!q || q.length < 2) {
      return res.json({ suggestions: [] });
    }

    // Query otimizada para autocomplete
    const result = await db.execute(sql`
      SELECT 
        id, 
        name, 
        province, 
        district, 
        lat::float, 
        lng::float,
        type,
        CASE 
          WHEN lower(name) = lower(${q}) THEN 0
          WHEN lower(name) LIKE lower(${q} || '%') THEN 1
          WHEN lower(name) LIKE lower('%' || ${q} || '%') THEN 2
          ELSE 3
        END as relevance_rank
      FROM mozambique_locations
      WHERE name ILIKE ${`%${q}%`}
      ORDER BY 
        relevance_rank,
        CASE type 
          WHEN 'city' THEN 1
          WHEN 'town' THEN 2
          WHEN 'village' THEN 3
          ELSE 4
        END,
        name
      LIMIT ${limit}
    `);

    const suggestions = Array.isArray(result) ? result : [];
    
    res.json({ 
      suggestions,
      total: suggestions.length
    });
    
  } catch (error) {
    console.error('Erro no autocomplete de localidades:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/locations/search?q=mapu&lat=-25.9667&lng=32.5833&limit=10
router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q as string || "").trim();
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : null;
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : null;
    const limit = Math.min(parseInt((req.query.limit as string) || "10", 10), 50);

    if (!q) {
      return res.json({ results: [] });
    }

    let result: any[];

    if (lat && lng) {
      // Busca com ordenação por distância
      result = await db.execute(sql`
        SELECT
          id,
          name,
          province,
          district,
          lat::float,
          lng::float,
          type,
          ST_Distance(
            ST_SetSRID(ST_MakePoint(lng, lat), 4326),
            ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)
          ) AS distance_m
        FROM mozambique_locations
        WHERE name ILIKE ${`%${q}%`}
        ORDER BY distance_m ASC
        LIMIT ${limit}
      `);
    } else {
      // Busca apenas por texto
      result = await db.execute(sql`
        SELECT
          id,
          name,
          province,
          district,
          lat::float,
          lng::float,
          type
        FROM mozambique_locations
        WHERE name ILIKE ${`%${q}%`}
        ORDER BY
          CASE WHEN lower(name) = lower(${q}) THEN 0
               WHEN lower(name) LIKE lower(${q} || '%') THEN 1
               ELSE 2 END,
          name
        LIMIT ${limit}
      `);
    }

    res.json({ 
      results: Array.isArray(result) ? result : [],
      total: Array.isArray(result) ? result.length : 0
    });

  } catch (error) {
    console.error('Erro na busca de localidades:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/locations/provinces - Lista todas as províncias
router.get('/provinces', async (req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT DISTINCT province 
      FROM mozambique_locations 
      WHERE province IS NOT NULL 
      ORDER BY province
    `);
    
    const provinces = Array.isArray(result) ? result.map((row: any) => row.province) : [];
    res.json({ provinces });
  } catch (error) {
    console.error('Erro ao buscar províncias:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/locations/stats - Estatísticas das localidades
router.get('/stats', async (req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT 
        COUNT(*) as total_localidades,
        COUNT(DISTINCT province) as total_provincias,
        COUNT(DISTINCT district) as total_distritos,
        COUNT(*) FILTER (WHERE type = 'city') as total_cidades,
        COUNT(*) FILTER (WHERE type = 'town') as total_vilas,
        COUNT(*) FILTER (WHERE type = 'village') as total_aldeias
      FROM mozambique_locations
    `);

    const stats = Array.isArray(result) && result[0] ? result[0] : {};
    res.json({ stats });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;