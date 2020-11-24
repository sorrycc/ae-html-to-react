import { readFileSync, writeFileSync } from 'fs';
// @ts-ignore
import Basement from '@alipay/basement';
import postcss from 'postcss';
import urllib from 'urllib';
import { join, dirname, basename } from 'path';
import mkdirp from 'mkdirp';

export default async function (opts: {
  file: string;
  target: string;
  appId: string;
  masterKey: string;
}) {
  mkdirp.sync(opts.target);
  const componentName = basename(opts.target);

  // js
  const js = await transformJS({ file: opts.file, componentName });
  writeFileSync(join(opts.target, 'index.tsx'), js, 'utf-8');

  // css
  const cssFile = opts.file.replace(/\.html$/, '_style.css');
  const css = await transformCSS({
    file: cssFile,
    animKey: `${componentName}Key`,
    ...(opts.appId &&
      opts.masterKey && {
        uploadImages: {
          appId: opts.appId,
          masterKey: opts.masterKey,
        },
      }),
  });
  writeFileSync(join(opts.target, 'index.less'), css, 'utf-8');
}

export async function transformJS(opts: {
  file: string;
  componentName: string;
}) {
  const content = readFileSync(opts.file, 'utf-8');
  const m = content.match(/<body>([\s\S]+)<\/body>/);
  if (m && m[1]) {
    const body = m[1].split(/[\r\n]/).map((line) => {
      line.match(/class=""/);
      return line
        .replace(/\sclass=\"(.+?)\"/, (a, b) => {
          const styles = b.split(' ').map((name: string) => {
            return `styles.${name}`;
          });
          return ` className={classnames(${styles.join(', ')})}`;
        })
        .replace(/\sid=\".+?\"/, '')
        .replace(/\sAELayerName=\".+?\"/, '')
        .replace(/><\/div>/, ' />');
    });
    return `
import React from 'react';
import classnames from 'classnames';
import styles from './index.less';

const ${opts.componentName}: React.FC = () => {
  return (
${body.join('\n').trim()}
  );
};

export default ${opts.componentName};
    `;
  } else {
    throw new Error('<body> 内元素匹配失败');
  }
}

export async function transformCSS(opts: {
  file: string;
  animKey?: string;
  uploadImages?: {
    appId: string;
    masterKey: string;
  };
}) {
  const content = readFileSync(opts.file, 'utf-8');
  const root = postcss.parse(content, {});

  // 1. 添加 background-contain
  // 2. 压缩图片
  // 3. 自动上传图片文件
  // 4. 修改 Anim Name
  const imageCache: any = {};
  for (const node of root.nodes) {
    if (node.type === 'rule' && node.nodes) {
      for (const decl of node.nodes) {
        if (
          decl.type === 'decl' &&
          decl.prop === 'background' &&
          decl.value.startsWith('url(')
        ) {
          console.log(`处理背景图规则：${decl.value}`);
          if (opts.uploadImages) {
            const m = decl.value.match(/url\(\"(.+?)\"\)/);
            if (m && m[1]) {
              const image = decodeURI(m[1]);
              console.log(`处理背景图：${image}`);
              const file = join(dirname(opts.file), image);
              console.log(`上传图片: ${file}`);
              let res: any;
              if (imageCache[file]) {
                console.log('图片已存在于缓存中');
                res = imageCache[file];
                decl.value = `url(${res.url})`;
              } else {
                res = await uploadImage({
                  file,
                  appId: opts.uploadImages.appId,
                  masterKey: opts.uploadImages.masterKey,
                });
                if (res && res.url) {
                  imageCache[file] = res;
                  console.log(`图片上传成功: ${res.url}`);
                  decl.value = `url(${res.url})`;
                } else {
                  console.error(`图片上传失败`);
                }
              }
            }
          }
          console.log(
            `添加 background-size: contain; 和 uc-perf-stat-ignore: image;`,
          );
          decl.after(`background-size: contain;`);
          decl.after(`uc-perf-stat-ignore: image;`);
        }
        if (opts.animKey && decl.type === 'decl' && decl.prop === 'animation') {
          decl.value = decl.value.replace('BX_AniKey', opts.animKey);
        }
      }
    }
    if (opts.animKey && node.type === 'atrule' && node.name === 'keyframes') {
      node.params = node.params.replace('BX_AniKey', opts.animKey);
    }
  }

  return root.toResult().css;
}

export async function uploadImage(opts: {
  file: string;
  appId: string;
  masterKey: string;
}) {
  const basement = new Basement({
    // 获取 appId 和 masterKey: https://basement.alipay.com/doc/detail/ziarab#da1386cd
    appId: opts.appId,
    masterKey: opts.masterKey,
    urllib,
    endpoint: 'https://basement-gzone.alipay.com',
  });
  return await basement.file.upload(basename(opts.file), opts.file, {
    mode: 'public',
    force: false,
  });
}
