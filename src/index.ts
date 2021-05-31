import generator from "@babel/generator";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import * as types from "@babel/types";
import { Plugin } from "vite";

const identifierNameFactory = (function(){
  let count = 0;
  return () => `Component${count++}`
}())

const visitor = (ast : types.File) => ({
  ArrowFunctionExpression(path : any) {
    const {
      body
    } = path.node;
    if(
      types.isCallExpression(path.node.body) &&
      body.callee.type === "Import" &&
      types.isObjectProperty(path.parent)
    ){
      const componentName = identifierNameFactory();
      const source = body.arguments[0].value;
      const importAst = types.importDeclaration(
        [
          types.importDefaultSpecifier(types.identifier(componentName))
        ],
        types.stringLiteral(source)
      );
      path.parent.value = types.identifier(componentName);
      ast.program.body.unshift(importAst);
    }
  }
});

function compile(code : string, fileName : string) {
  const ast = parse(code, {
    sourceType : "module",
    plugins : [
      "typescript"
    ],
    sourceFilename : fileName
  });

  traverse(ast, visitor(ast));

  const {
    code : newCode,
    map
  } = generator(ast,{ 
    sourceMaps: true
  }, {
    [fileName] : code
  });

  return {
    ast,
    code : newCode,
    map
  }
}

/**
 * 创建一个将异步加载的函数转化为同步加载，主要用于路由中动态加载组件转换为同步加载
 * @param filePathExt 文件路径，会用endsWith对其进行匹配
 * @returns rollPlugin
 */
export default function transformCreator(filePathExt : string) : Plugin {
  return {
    name: 'vite-plugin-ds2sync-import', // this name will show up in warnings and errors
    enforce: "pre",
    apply: "build",
    // @ts-ignore
    transform (code, id) {
      if(filePathExt && id.endsWith(filePathExt)){
        return compile(code, id);
      }
      return 
    }
  };
}