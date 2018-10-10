const notCssImport = modName => !/.*\.(css|scss|sass|less)$/m.test(modName);

const notRequire = (t, nodePath) => {
  const [ requireArg, ...rest ] = nodePath.node.arguments;
  return nodePath.node.callee.name !== 'require' ||
    rest.length !== 0 ||
    !t.isStringLiteral(requireArg) ||
    nodePath.scope.hasBinding('require');
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
      CallExpression(nodePath) {
        if (notRequire(t, nodePath)) return;
        const [ requireArg ] = nodePath.node.arguments;
        const { value: modName } = requireArg;
        if (notCssImport(modName)) return;
        const ast = fetchLink(nodePath, modName);
        nodePath.replaceWithMultiple(ast);
      },
      ImportDeclaration(nodePath) {
        const { value: modName } = nodePath.node.source;
        if (notCssImport(modName)) return;
        const ast = fetchLink(nodePath, modName);
        nodePath.replaceWithMultiple(ast);
      },
    },
  };
};
