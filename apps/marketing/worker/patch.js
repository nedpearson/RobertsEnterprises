const fs = require('fs');
const path = 'src/modules/form-bridge/routes.ts';
let code = fs.readFileSync(path, 'utf8');

const replacement = 
  // Read the raw stream if nothing parsed it
  let rawBodyStr = '';
  await new Promise((resolve) => {
    if ((req as any).rawBody) {
      rawBodyStr = (req as any).rawBody.toString('utf8');
      resolve(true);
    } else {
      req.on('data', (chunk) => { rawBodyStr += chunk.toString(); });
      req.on('end', () => resolve(true));
      if (req.complete) resolve(true);
    }
  });

  console.log('[form-bridge] Raw body extracted:', rawBodyStr);

  let parsedBody = req.body;
  if (Object.keys(parsedBody).length === 0 && rawBodyStr) {
    try {
      parsedBody = JSON.parse(rawBodyStr);
    } catch (e) {
      const qs = require('querystring');
      parsedBody = qs.parse(rawBodyStr);
    }
  }

  console.log('[form-bridge] FINAL Parsed Fields:', parsedBody);

  const { provider, externalSubmissionId, siteDomain: bodyDomain, locationHint, ...fields } = parsedBody;
;

code = code.replace(/let parsedBody = req\.body;[\s\S]*?const \{ provider, externalSubmissionId, siteDomain: bodyDomain, locationHint, \.\.\.fields \} = parsedBody;/, replacement);

fs.writeFileSync(path, code);
