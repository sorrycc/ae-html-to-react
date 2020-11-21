# ae-html-to-react

[![NPM version](https://img.shields.io/npm/v/ae-html-to-react.svg?style=flat)](https://npmjs.org/package/ae-html-to-react)

一键转换 AE 编译出的 html 动画文件为 React 格式。

## Install

```bash
$ yarn global add ae-html-to-react
```

## Usage

```bash
$ ae-html-to-react --file /path/to/html/file --target /path/to/component --appId xxx --masterKey xxx 
```

## Options

### file

AE 产出的 HTML 文件，CSS 会自动查找。

### target

目标组件目录，比如 /path/to/project/src/components/FooBar 。

### appId

basement 上申请。

### masterKey

basement 上申请。

## LICENSE

MIT
