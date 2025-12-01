#!/usr/bin/env python3
import re

with open('src/apps/main-app/components/RideSearchModal.tsx', 'r') as f:
    content = f.read()

# Substituir o import problemático
old_import = 'import { apiService, type Ride, type RideSearchResponse } from \'@/services/api\';'
new_import = 'import { apiService } from "@/shared/lib/api";\nimport type { Ride, RideSearchResponse } from "@/shared/lib/api-utils";'

content = content.replace(old_import, new_import)

with open('src/apps/main-app/components/RideSearchModal.tsx', 'w') as f:
    f.write(content)

print("✅ RideSearchModal.tsx corrigido!")
