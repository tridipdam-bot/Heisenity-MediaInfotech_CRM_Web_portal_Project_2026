// module-alias-register.js
const path = require('path');
const moduleAlias = require('module-alias');

// Map the TS alias "@" used in source to the compiled 'dist' folder.
// This ensures compiled files that still import like "@/lib/prisma"
// will load from dist/lib/prisma.js at runtime.
moduleAlias.addAlias('@', path.join(__dirname, 'dist'));
moduleAlias.addAlias('@/lib', path.join(__dirname, 'dist', 'lib'));

// (Optional) log for local debugging
if (process.env.DEBUG_MODULE_ALIAS === 'true') {
  console.log('[module-alias] Aliases added: @ ->', path.join(__dirname, 'dist'));
}
