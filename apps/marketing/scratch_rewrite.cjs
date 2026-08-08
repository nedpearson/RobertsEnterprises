const fs = require('fs');
const path = 'src/features/proper-commerce/api/properCommerceApi.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/mockProducts/g, 'inMemoryProducts');
code = code.replace(/mockMovements/g, 'inMemoryMovements');
code = code.replace(/mockOrders/g, 'inMemoryOrders');
code = code.replace(/mockCountSessions/g, 'inMemoryCountSessions');
code = code.replace(/mockSyncIssues/g, 'inMemorySyncIssues');

code = code.replace(/Initial Mock Connection State/g, 'Initial Local Connection State');
code = code.replace(/Initial Mock Seed Products/g, 'Initial Seed Products');

code = code.replace('import {\n  CatalogProduct,', 'import { getActiveDataPlane } from \'@/lib/supabase\';\nimport {\n  CatalogProduct,');

code = code.replace('let inMemoryProducts: CatalogProduct[] = [', 'let inMemoryProducts: CatalogProduct[] = getActiveDataPlane() === \'demo\' ? [');
code = code.replace('const inMemoryMovements: InventoryMovement[] = [', 'let inMemoryMovements: InventoryMovement[] = getActiveDataPlane() === \'demo\' ? [');
code = code.replace('const inMemoryOrders: CommerceOrder[] = [', 'let inMemoryOrders: CommerceOrder[] = getActiveDataPlane() === \'demo\' ? [');

code = code.replace('  },\n];\n\nlet inMemoryMovements', '  },\n] : [];\n\nlet inMemoryMovements');
code = code.replace('  },\n];\n\nlet inMemoryOrders', '  },\n] : [];\n\nlet inMemoryOrders');
code = code.replace('  },\n];\n\nlet inMemoryCountSessions', '  },\n] : [];\n\nlet inMemoryCountSessions');

fs.writeFileSync(path, code);
console.log('Done!');
