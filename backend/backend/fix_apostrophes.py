#!/bin/python3
import re

def fix_sql_apostrophes(content):
    # Corrigir apóstrofos dentro dos valores - substituir ' por ''
    pattern = r"\('([^']*'[^']*)'\)"
    
    def replace_apostrophe(match):
        inner = match.group(1)
        # Substituir apóstrofo simples por dois apóstrofos (escape SQL)
        inner_fixed = inner.replace("'", "''")
        return f"('{inner_fixed}')"
    
    # Aplicar a correção
    fixed_content = re.sub(pattern, replace_apostrophe, content)
    return fixed_content

# Ler o arquivo original
with open('dados_corrigidos.sql', 'r', encoding='utf-8') as f:
    content = f.read()

# Corrigir apóstrofos
fixed_content = fix_sql_apostrophes(content)

# Salvar arquivo corrigido
with open('dados_sem_apostrofos.sql', 'w', encoding='utf-8') as f:
    f.write(fixed_content)

print("✅ Apóstrofos corrigidos! Arquivo salvo como 'dados_sem_apostrofos.sql'")

# Encontrar linhas problemáticas
print("\n🔍 Linhas com apóstrofos encontradas:")
for i, line in enumerate(content.split('\n'), 1):
    if "N'Gapa" in line or "''" in line:
        print(f"Linha {i}: {line.strip()}")
