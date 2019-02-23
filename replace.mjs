import path from 'path';

export default function replaceToRelative(text, pathname) {
  return text.replace(/^(import|export)([^'"\n=]*)('|")(.*)(\3);?$/gm, (match, p1, p2, p3, p4) => {
    const name = p4.endsWith('.js') ? p4 : `${p4}.js`;
    return `${p1}${p2}${"'"}${
      p4.startsWith('.') ? name : path.relative(pathname, name).replace('../', './')
    }${"'"};`;
  });
}
