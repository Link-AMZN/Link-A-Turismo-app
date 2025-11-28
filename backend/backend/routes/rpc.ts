// routes/rpc.ts
import { Router, Request, Response } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';

const router = Router();

// ✅ ROTA RPC PARA CHAMAR FUNÇÕES POSTGRESQL
router.post('/', async (req: Request, res: Response) => {
  try {
    const { function: functionName, params = [] } = req.body;

    console.log('🧠 [RPC] Chamando função PostgreSQL:', {
      function: functionName,
      params,
      timestamp: new Date().toISOString()
    });

    if (!functionName) {
      return res.status(400).json({
        success: false,
        error: 'Nome da função é obrigatório',
        details: 'O parâmetro "function" deve ser fornecido'
      });
    }

    // ✅ VALIDAR FUNÇÕES PERMITIDAS (SEGURANÇA)
    const allowedFunctions = [
      'get_rides_smart_final',
      'normalize_location_name',
      'search_rides_by_location',
      'find_nearby_rides'
    ];

    if (!allowedFunctions.includes(functionName)) {
      return res.status(403).json({
        success: false,
        error: 'Função não permitida',
        details: `A função "${functionName}" não está na lista de funções permitidas`
      });
    }

    // ✅ CONSTRUIR QUERY DINÂMICA
    let query: string;
    let queryParams: any[] = [];

    if (functionName === 'get_rides_smart_final') {
      const [search_from, search_to, radius_km, max_results] = params;
      
      query = `SELECT * FROM get_rides_smart_final($1, $2, $3, $4)`;
      queryParams = [
        search_from || '',
        search_to || '', 
        radius_km || 100,
        max_results || 50
      ];
    } else {
      // ✅ CORREÇÃO: Adicionar tipos aos parâmetros da função map
      const placeholders = params.map((_: any, index: number) => `$${index + 1}`).join(', ');
      query = `SELECT * FROM ${functionName}(${placeholders})`;
      queryParams = params;
    }

    console.log('🔍 [RPC] Executando query:', {
      query,
      params: queryParams
    });

    // ✅ CORREÇÃO: Executar função PostgreSQL de forma segura
    let result: any;
    
    try {
      // ✅ MÉTODO 1: Usar sql template com parâmetros interpolados (mais seguro)
      if (functionName === 'get_rides_smart_final') {
        const [p1, p2, p3, p4] = queryParams;
        result = await db.execute(sql`
          SELECT * FROM get_rides_smart_final(${p1}, ${p2}, ${p3}, ${p4})
        `);
      } else {
        // Para outras funções, construir dinamicamente
        const dynamicSql = sql`SELECT * FROM ${sql.raw(functionName)}(${sql.join(queryParams.map((p: any) => sql`${p}`), sql`, `)})`;
        result = await db.execute(dynamicSql);
      }
    } catch (executeError) {
      console.warn('❌ [RPC] Método seguro falhou, tentando raw query:', executeError);
      
      // ✅ MÉTODO 2: Fallback para raw query com interpolação manual
      const interpolatedQuery = query.replace(/\$(\d+)/g, (_: string, index: string) => {
        const paramIndex = parseInt(index) - 1;
        const param = queryParams[paramIndex];
        return typeof param === 'string' ? `'${param.replace(/'/g, "''")}'` : String(param);
      });
      
      result = await db.execute(sql.raw(interpolatedQuery));
    }

    // ✅ EXTRAIR RESULTADOS DE FORMA SEGURA
    let rows: any[] = [];
    
    if (Array.isArray(result)) {
      rows = result;
    } else if (result && typeof result === 'object' && 'rows' in result) {
      rows = (result as any).rows;
    } else if (result && typeof result === 'object') {
      const values = Object.values(result);
      if (Array.isArray(values[0])) {
        rows = values[0] as any[];
      }
    }

    console.log('✅ [RPC] Função executada com sucesso:', {
      function: functionName,
      results: rows.length,
      sample: rows[0] || 'Nenhum resultado'
    });

    res.json({
      success: true,
      data: rows,
      metadata: {
        function: functionName,
        params: queryParams,
        results: rows.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ [RPC] Erro ao executar função:', error);
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
      function: req.body.function
    });
  }
});

// ✅ ROTA GET PARA TESTE DA RPC
router.get('/test', async (req: Request, res: Response) => {
  try {
    // Testar a função get_rides_smart_final com parâmetros padrão
    const result = await db.execute(sql`
      SELECT * FROM get_rides_smart_final('', '', 100, 10)
    `);

    let rows: any[] = [];
    
    if (Array.isArray(result)) {
      rows = result;
    } else if (result && typeof result === 'object' && 'rows' in result) {
      rows = (result as any).rows;
    }

    res.json({
      success: true,
      message: 'RPC test endpoint working',
      function: 'get_rides_smart_final',
      results: rows.length,
      data: rows.slice(0, 3) // Retornar apenas 3 para teste
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro no teste RPC',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

export default router;