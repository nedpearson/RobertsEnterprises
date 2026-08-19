/* eslint-disable @typescript-eslint/no-explicit-any */
import { Project, SyntaxKind, JsxOpeningElement, JsxSelfClosingElement, Node, ArrowFunction, FunctionExpression, CallExpression } from 'ts-morph';
import * as fs from 'fs';
import * as path from 'path';

interface InteractionRecord {
  id: string;
  file: string;
  component: string;
  element: string;
  label: string;
  status: 'VERIFIED' | 'STATIC' | 'PLACEHOLDER' | 'NOT CONFIGURED';
  failureReason?: string;
  lineNumber: number;
}

const project = new Project({
  tsConfigFilePath: 'tsconfig.app.json',
});

// Explicitly add src files if they aren't loaded by the config
project.addSourceFilesAtPaths('src/**/*.tsx');
const sourceFiles = project.getSourceFiles('src/**/*.tsx');

const interactiveTags = new Set([
  'Button', 'button', 'a', 'Link', 'NavLink', 
  'DropdownMenuItem', 'TabsTrigger', 'Toggle', 'Checkbox', 
  'RadioGroupItem', 'Switch', 'SelectItem'
]);

const records: InteractionRecord[] = [];

function isDeadHandler(node: Node): { isDead: boolean, reason?: string } {
  // If the node is an identifier, try to find its declaration
  if (Node.isIdentifier(node)) {
    const symbol = node.getSymbol();
    if (symbol) {
      const decls = symbol.getDeclarations();
      if (decls.length > 0) {
        const decl = decls[0];
        // If it's a variable declaration (e.g. const handler = () => {})
        if (Node.isVariableDeclaration(decl)) {
          const init = decl.getInitializer();
          if (init && (Node.isArrowFunction(init) || Node.isFunctionExpression(init))) {
            return isDeadHandler(init);
          }
        }
        // If it's a function declaration
        if (Node.isFunctionDeclaration(decl)) {
          const body = decl.getBody();
          if (body) {
            return checkBody(body);
          }
        }
      }
    }
  }

  // If it's a direct empty arrow function like () => {}
  if (Node.isArrowFunction(node) || Node.isFunctionExpression(node)) {
    const body = node.getBody();
    return checkBody(body);
  }

  // If it's the identifier `undefined`
  if (node.getText() === 'undefined') {
    return { isDead: true, reason: 'Handler is explicitly undefined' };
  }

  return { isDead: false };
}

function checkBody(body: Node): { isDead: boolean, reason?: string } {
  // Check if body is empty block {}
  if (Node.isBlock(body) && body.getStatements().length === 0) {
    return { isDead: true, reason: 'Empty handler () => {}' };
  }
  
  // Check if it's just returning null or undefined
  if (body.getText() === 'null' || body.getText() === 'undefined') {
    return { isDead: true, reason: 'Handler returns ' + body.getText() };
  }

  // Check if the only statement is a toast, alert, prompt, or console.log
  if (Node.isBlock(body)) {
    const statements = body.getStatements();
    if (statements.length === 1) {
      const stmt = statements[0];
      if (Node.isExpressionStatement(stmt)) {
        const expr = stmt.getExpression();
        if (Node.isCallExpression(expr)) {
          const callee = expr.getExpression().getText();
          if (callee === 'toast' || callee.startsWith('toast.') || callee === 'console.log' || callee === 'alert' || callee === 'alert(') {
            return { isDead: true, reason: `Mock handler using ${callee}()` };
          }
        }
      }
    }
  } else if (Node.isCallExpression(body)) {
    // e.g. () => toast('...')
    const callee = body.getExpression().getText();
    if (callee === 'toast' || callee.startsWith('toast.') || callee === 'console.log' || callee === 'alert') {
      return { isDead: true, reason: `Mock handler using ${callee}()` };
    }
  }
  return { isDead: false };
}

function processElement(element: JsxOpeningElement | JsxSelfClosingElement, sourceFile: any) {
  const tagName = element.getTagNameNode().getText();
  const attributes = element.getAttributes();
  
  let hasInteractiveAttr = false;
  let isDead = false;
  let failureReason = '';
  let label = '';
  let handlerCode = '';

  // Attempt to extract text label if it's an opening element
  if (Node.isJsxOpeningElement(element)) {
    const parent = element.getParentIfKind(SyntaxKind.JsxElement);
    if (parent) {
      const children = parent.getJsxChildren();
      label = children.filter(c => Node.isJsxText(c)).map(c => c.getText().trim()).join(' ').substring(0, 50).trim();
    }
  }

  for (const attr of attributes) {
    if (Node.isJsxAttribute(attr)) {
      const attrName = attr.getNameNode().getText();
      
      // Extract label from attributes if text wasn't found
      if ((attrName === 'label' || attrName === 'title' || attrName === 'text') && attr.getInitializer()) {
        label = label || attr.getInitializer()!.getText();
      }

      // Check onClick / onSubmit etc.
      if (attrName.startsWith('on') && attrName.length > 2 && attrName[2] === attrName[2].toUpperCase()) {
        hasInteractiveAttr = true;
        const initializer = attr.getInitializer();
        if (initializer && Node.isJsxExpression(initializer)) {
          const expr = initializer.getExpression();
          if (expr) {
            handlerCode = expr.getText();
            const deadCheck = isDeadHandler(expr);
            if (deadCheck.isDead) {
              isDead = true;
              failureReason = deadCheck.reason || 'Unknown dead handler';
            }
          }
        }
      }

      // Check href="#"
      if (attrName === 'href' || attrName === 'to') {
        const initializer = attr.getInitializer();
        if (initializer) {
          const val = initializer.getText().replace(/['"]/g, '');
          if (val === '#' || val === '' || val.startsWith('javascript:')) {
            isDead = true;
            failureReason = `Placeholder link destination: ${val}`;
          }
        }
      }
    }
  }

  // If it's an interactive tag or has an interactive attribute, register it
  if (interactiveTags.has(tagName) || hasInteractiveAttr) {
    // Generate a pseudo-ID
    const lineNumber = sourceFile.getLineAndColumnAtPos(element.getStart()).line;
    const componentName = sourceFile.getBaseNameWithoutExtension();
    const id = `${componentName}-${tagName}-${lineNumber}`;
    
    // Explicit allowlist bypass can be checked here (e.g. `/* allow-static */` comment check)
    // For now, assume anything dead is PLACEHOLDER
    
    let status: InteractionRecord['status'] = 'VERIFIED';
    if (isDead) status = 'PLACEHOLDER';
    else if (label.toLowerCase().includes('coming soon') || label.toLowerCase().includes('not implemented')) {
      status = 'STATIC';
      failureReason = 'Hardcoded coming soon text';
    }

    records.push({
      id,
      file: sourceFile.getFilePath().replace(process.cwd(), ''),
      component: componentName,
      element: tagName,
      label: label || '<Dynamic/Icon>',
      status,
      failureReason,
      lineNumber
    });
  }
}

for (const sourceFile of sourceFiles) {
  sourceFile.forEachDescendant(node => {
    if (Node.isJsxOpeningElement(node) || Node.isJsxSelfClosingElement(node)) {
      processElement(node, sourceFile);
    }
  });
}

// Generate the output files
const jsonOutput = JSON.stringify(records, null, 2);
fs.writeFileSync('interaction-certification.json', jsonOutput);

const brokenRecords = records.filter(r => r.status !== 'VERIFIED');

let mdReport = `# Interaction Certification Report\n\n`;
mdReport += `**Total Elements Scanned:** ${records.length}\n`;
mdReport += `**Verified Elements:** ${records.length - brokenRecords.length}\n`;
mdReport += `**Dead/Placeholder Elements:** ${brokenRecords.length}\n\n`;

mdReport += `## Dead Controls to Repair\n\n`;
mdReport += `| File | Component | Element | Label | Reason |\n`;
mdReport += `|---|---|---|---|---|\n`;

brokenRecords.forEach(r => {
  mdReport += `| ${r.file}:${r.lineNumber} | ${r.component} | \`<${r.element}>\` | ${r.label} | ${r.failureReason} |\n`;
});

fs.writeFileSync('interaction-certification.md', mdReport);

console.log(`Inventory complete. Found ${records.length} interactions, ${brokenRecords.length} placeholders.`);
if (process.argv.includes('--fail-on-dead') && brokenRecords.length > 0) {
  console.error('CI FAILURE: Dead controls detected.');
  process.exit(1);
}

