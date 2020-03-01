const notCssImport = modName => !/.*\.(css|scss|sass|less)$/m.test(modName);

const notRequire = (t, nodePath) => {
  const [ requireArg, ...rest ] = nodePath.node.arguments;
  return nodePath.node.callee.name !== 'require' ||
    rest.length !== 0 ||
    !t.isStringLiteral(requireArg) ||
    nodePath.scope.hasBinding('require');
};

const determineLeftExpression = (t, node) => {
  if (isDestructuredImportExpression(t, node)) {
    return buildObjectPatternFromDestructuredImport(t, node);
  }

  const [specifier] = node.specifiers;

  return t.identifier(specifier.local.name);
};

const buildObjectPatternFromDestructuredImport = (t, node) => {
  const properties = node.specifiers.map(specifier => t.objectProperty(
    t.identifier(specifier.imported.name),
    t.identifier(specifier.local.name)
  ));

  return t.objectPattern(properties);
};

const isDestructuredImportExpression = (t, node) => {
  return node.specifiers.length !== 0 && node.specifiers.some(specifier => !t.isImportDefaultSpecifier(specifier));
};

const cleanJSON = (t, node, json) => {
  if (isDestructuredImportExpression(t, node)) {
    const res = {};
    for (const specifier of node.specifiers) {
      const { name } = specifier.imported;
      if (name in json) res[name] = json[name];
    }
    return res;
  }

  return json;
};

const cleanRequiredJSON = (t, node, json) => {
  if (t.isObjectPattern(node.id)) {
    const res = {};
    for (const property of node.id.properties) {
      const { name } = property.key;
      if (name in json) res[name] = json[name];
    }
    return res;
  }

  return json;
};

module.exports = function({ types: t }) {
  const documentCreateElementLink = t.callExpression(
    t.memberExpression(
      t.identifier('document'),
      t.identifier('createElement'),
    ),
    [ t.stringLiteral('link') ],
  );
  const rel = t.identifier('rel');
  const stylesheet = t.stringLiteral('stylesheet');
  const href = t.identifier('href');
  const documentHeadAppendChild = t.memberExpression(
    t.memberExpression(
      t.identifier('document'),
      t.identifier('head'),
    ),
    t.identifier('appendChild'),
  );

  const fetchLink = (nodePath, modName) => {
    const name = nodePath.scope.generateUidIdentifierBasedOnNode('link');
    return [
    // const ${name} = document.createElement('link');
      t.variableDeclaration('const', [
        t.variableDeclarator(
          name,
          documentCreateElementLink,
        ),
      ]),
      // ${name}.rel = 'stylesheet';
      t.expressionStatement(t.assignmentExpression(
        '=',
        t.memberExpression(
          name,
          rel,
        ),
        stylesheet,
      )),
      // ${name}.href = '${modName}';
      t.expressionStatement(t.assignmentExpression(
        '=',
        t.memberExpression(
          name,
          href,
        ),
        t.stringLiteral(modName),
      )),
      // document.head.appendChild(${name});
      t.expressionStatement(t.callExpression(
        documentHeadAppendChild,
        [ name ],
      )),
    ];
  };

  return {
    visitor: {
      CallExpression(nodePath, stats) {
        const { styleMaps = {} } = stats.opts;
        if (notRequire(t, nodePath)) return;
        const { node, parent } = nodePath;
        const [ requireArg ] = node.arguments;
        const { value: modName } = requireArg;
        if (notCssImport(modName)) return;
        const ast = fetchLink(nodePath, modName);
        if (t.isVariableDeclarator(parent)) {
          nodePath.insertAfter(ast);
          nodePath.replaceWith(t.valueToNode(cleanRequiredJSON(t, parent, styleMaps[modName] || {})));
        } else {
          nodePath.replaceWithMultiple(ast);
        }
      },
      ImportDeclaration(nodePath, stats) {
        const { styleMaps = {} } = stats.opts;
        const { node } = nodePath;
        const { value: modName } = node.source;
        if (notCssImport(modName)) return;
        const ast = fetchLink(nodePath, modName);
        if (node.specifiers.length !== 0) {
          const leftExpression = determineLeftExpression(t, node);
          nodePath.insertAfter(t.variableDeclaration('const', [
            t.variableDeclarator(
              leftExpression,
              t.valueToNode(cleanJSON(t, node, styleMaps[modName] || {})),
            ),
          ]));
        }
        nodePath.replaceWithMultiple(ast);
      },
    },
  };
};
