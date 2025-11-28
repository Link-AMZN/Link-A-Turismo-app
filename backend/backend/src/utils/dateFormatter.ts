// Utilitário global para formatação de datas no formato Moçambique (24h)
export class MozambiqueDateFormatter {
  
  // ✅ FORMATO DATA COMPLETA: "DD/MM/AAAA HH:mm" (24h)
  static formatDateTime(date: Date | string | null): string {
    if (!date) return 'Data não disponível';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false, // ✅ FORÇAR 24 HORAS
      timeZone: 'Africa/Maputo'
    });
  }
  
  // ✅ FORMATO APENAS DATA: "DD/MM/AAAA"
  static formatDateOnly(date: Date | string | null): string {
    if (!date) return 'Data não disponível';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Africa/Maputo'
    });
  }
  
  // ✅ FORMATO APENAS HORA: "HH:mm" (24h)
  static formatTimeOnly(date: Date | string | null): string {
    if (!date) return 'Hora não disponível';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleTimeString('pt-PT', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false, // ✅ FORÇAR 24 HORAS
      timeZone: 'Africa/Maputo'
    });
  }
  
  // ✅ FORMATO LONGO: "Sexta-feira, 20 de Dezembro de 2025"
  static formatLongDate(date: Date | string | null): string {
    if (!date) return 'Data não disponível';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('pt-PT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Africa/Maputo'
    });
  }
  
  // ✅ FORMATO DIA DA SEMANA: "Sexta-feira"
  static formatWeekday(date: Date | string | null): string {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('pt-PT', {
      weekday: 'long',
      timeZone: 'Africa/Maputo'
    });
  }
}

// Exportações convencionais
export const formatDateTime = MozambiqueDateFormatter.formatDateTime;
export const formatDateOnly = MozambiqueDateFormatter.formatDateOnly;
export const formatTimeOnly = MozambiqueDateFormatter.formatTimeOnly;
export const formatLongDate = MozambiqueDateFormatter.formatLongDate;
export const formatWeekday = MozambiqueDateFormatter.formatWeekday;