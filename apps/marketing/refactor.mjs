import { Project, SyntaxKind } from 'ts-morph';

const project = new Project({
  tsConfigFilePath: "c:/Users/nedpe/Downloads/roberts-enterprises-app (3)/RE/apps/marketing/tsconfig.app.json"
});

// Since we removed imports, there will be syntax errors for `LOCATIONS` and `locationById` and `revenueByMonth`.
// We just need to find all references to `LOCATIONS` and replace with `activeLocations`.
// For `locationById(x)`, replace with `(activeLocations.find(l => l.id === x) ?? activeLocations[0])`.
// For `revenueByMonth`, replace with `realRevenue`.
// AND inject `const { activeLocations, revenueByMonth: realRevenue } = useVowosData();` into the component/function where it's used.

for (const sf of project.getSourceFiles()) {
  let needsVowosData = false;
  let changed = false;

  const identifiers = sf.getDescendantsOfKind(SyntaxKind.Identifier);
  
  // Replace revenueByMonth
  const revs = identifiers.filter(id => id.getText() === 'revenueByMonth' && id.getParent().getKind() !== SyntaxKind.ImportSpecifier && id.getParent().getKind() !== SyntaxKind.PropertyAssignment);
  for (const r of revs) {
      if (r.getParent().getKind() === SyntaxKind.VariableDeclaration) {
          continue; // skip the destructuring itself if it exists
      }
      if (r.getText() === 'revenueByMonth') {
          r.replaceWithText('realRevenue');
          needsVowosData = true;
          changed = true;
      }
  }

  // Find all locationById calls
  const calls = sf.getDescendantsOfKind(SyntaxKind.CallExpression);
  for (const call of calls) {
      if (call.getExpression().getText() === 'locationById') {
          const arg = call.getArguments()[0].getText();
          call.replaceWithText(`(activeLocations.find(l => l.id === ${arg}) ?? activeLocations[0])`);
          needsVowosData = true;
          changed = true;
      }
  }

  // Replace LOCATIONS
  const locs = sf.getDescendantsOfKind(SyntaxKind.Identifier).filter(id => id.getText() === 'LOCATIONS');
  for (const loc of locs) {
      loc.replaceWithText('activeLocations');
      needsVowosData = true;
      changed = true;
  }
  
  if (changed && needsVowosData) {
      // Find where to inject `useVowosData()`. We need it inside a function component.
      // Easiest is to just see if there's an existing `useVowosData()` call in the component.
      // If there is, we modify it.
      // Since it's hard to associate with the exact function component if there are multiple,
      // we can just add `const { activeLocations, revenueByMonth: realRevenue } = useVowosData();` 
      // to the top of all exported functions or components that contain `activeLocations`.
      
      const functions = sf.getFunctions();
      for (const fn of functions) {
          if (fn.getText().includes('activeLocations') || fn.getText().includes('realRevenue')) {
              // check if it already has useVowosData
              const hasUse = fn.getVariableStatements().some(vs => vs.getText().includes('useVowosData'));
              if (!hasUse) {
                  fn.insertStatements(0, 'const { activeLocations, revenueByMonth: realRevenue } = useVowosData();');
              } else {
                  // If it has useVowosData, it might not extract activeLocations
                  const useVowosDataDec = fn.getVariableDeclarations().find(vd => vd.getInitializer() && vd.getInitializer().getText().includes('useVowosData'));
                  if (useVowosDataDec) {
                      const pattern = useVowosDataDec.getNameNode();
                      if (pattern.getKind() === SyntaxKind.ObjectBindingPattern) {
                          if (!pattern.getText().includes('activeLocations')) {
                              pattern.addBindingElement('activeLocations');
                          }
                          if (!pattern.getText().includes('realRevenue') && fn.getText().includes('realRevenue')) {
                              pattern.addBindingElement('revenueByMonth: realRevenue');
                          }
                      }
                  }
              }
          }
      }
      
      // Arrow functions (e.g. const X = () => {})
      const vars = sf.getVariableDeclarations();
      for (const vd of vars) {
          const init = vd.getInitializer();
          if (init && (init.getKind() === SyntaxKind.ArrowFunction)) {
              if (init.getText().includes('activeLocations') || init.getText().includes('realRevenue')) {
                  const hasUse = init.getDescendantsOfKind(SyntaxKind.VariableStatement).some(vs => vs.getText().includes('useVowosData'));
                  if (!hasUse) {
                      // Try inserting at body
                      const body = init.getBody();
                      if (body.getKind() === SyntaxKind.Block) {
                          body.insertStatements(0, 'const { activeLocations, revenueByMonth: realRevenue } = useVowosData();');
                      }
                  } else {
                      const useVowosDataDec = init.getDescendantsOfKind(SyntaxKind.VariableDeclaration).find(vd => vd.getInitializer() && vd.getInitializer().getText().includes('useVowosData'));
                      if (useVowosDataDec) {
                          const pattern = useVowosDataDec.getNameNode();
                          if (pattern.getKind() === SyntaxKind.ObjectBindingPattern) {
                              if (!pattern.getText().includes('activeLocations')) {
                                  pattern.addBindingElement('activeLocations');
                              }
                              if (!pattern.getText().includes('realRevenue') && init.getText().includes('realRevenue')) {
                                  pattern.addBindingElement('revenueByMonth: realRevenue');
                              }
                          }
                      }
                  }
              }
          }
      }
      
      // Add import for useVowosData if missing
      const imports = sf.getImportDeclarations();
      const hasUseVowosDataImport = imports.some(imp => imp.getNamedImports().some(ni => ni.getName() === 'useVowosData'));
      if (!hasUseVowosDataImport) {
          sf.addImportDeclaration({
              namedImports: ['useVowosData'],
              moduleSpecifier: '@/contexts/VowosDataContext'
          });
      }
  }
}

project.saveSync();
console.log('Refactoring complete');
