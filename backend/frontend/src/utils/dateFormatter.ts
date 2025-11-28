// Utilitário IDÊNTICO ao backend para consistência - VERSÃO CORRIGIDA
export class MozambiqueDateFormatter {
  
  // ✅ FORMATO DATA COMPLETA: "DD/MM/AAAA HH:mm" (24h)
  static formatDateTime(date: Date | string | null): string {
    if (!date) return 'Data não disponível';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // ✅ VALIDAÇÃO: Verificar se a data é válida
    if (isNaN(dateObj.getTime())) {
      return 'Data inválida';
    }
    
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
    
    if (isNaN(dateObj.getTime())) {
      return 'Data inválida';
    }
    
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
    
    if (isNaN(dateObj.getTime())) {
      return 'Hora inválida';
    }
    
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
    
    if (isNaN(dateObj.getTime())) {
      return 'Data inválida';
    }
    
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
    
    if (isNaN(dateObj.getTime())) {
      return '';
    }
    
    return dateObj.toLocaleDateString('pt-PT', {
      weekday: 'long', 
      timeZone: 'Africa/Maputo'
    });
  }
  
  // ✅ FORMATO RELATIVO: "Hoje", "Amanhã", "20/12/2025"
  static formatRelativeDate(date: Date | string | null): string {
    if (!date) return 'Data não disponível';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return 'Data inválida';
    }
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Reset horas para comparar apenas datas
    const compareDate = new Date(dateObj);
    compareDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    
    if (compareDate.getTime() === today.getTime()) {
      return 'Hoje';
    } else if (compareDate.getTime() === tomorrow.getTime()) {
      return 'Amanhã';
    } else {
      return this.formatDateOnly(dateObj);
    }
  }
}

// ✅✅✅ EXPORTAÇÕES CORRETAS E COMPLETAS
export const formatDateTime = MozambiqueDateFormatter.formatDateTime;
export const formatDateOnly = MozambiqueDateFormatter.formatDateOnly;
export const formatTimeOnly = MozambiqueDateFormatter.formatTimeOnly;
export const formatLongDate = MozambiqueDateFormatter.formatLongDate;
export const formatWeekday = MozambiqueDateFormatter.formatWeekday;
export const formatRelativeDate = MozambiqueDateFormatter.formatRelativeDate;

// ✅ EXPORTAÇÃO PADRÃO PARA FACILITAR IMPORTAÇÃO
export default MozambiqueDateFormatter;