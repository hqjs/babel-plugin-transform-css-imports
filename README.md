# https://hqjs.org
Transform css imports

# Installation
```sh
npm install hqjs@babel-plugin-transform-css-imports
```

# Usage
```json
{
    "plugins": [
      ["hqjs@babel-plugin-transform-css-imports", {
        "styleMaps": {
          "/main.css" : {
            "root": "root_01",
            "text": "text_1217",
            "color": "color_918"
          }
        }
      }
    ]
  ]
}
```
Option `styleMaps` pass relations between module name and class names translated by css modules.

# Transformation
Transforms `.css` imports into style loading and in case of named import - add css mosules transformation.

Let's say we have file `/main.css`
```css
.root {
  border-width: 2px;
  border-style: solid;
  border-color: #777;
  padding: 0 20px;
  margin: 0 6px;
  max-width: 400px;
}

.text {
  color: #777;
  font-size: 24px;
  font-family: helvetica, arial, sans-serif;
  font-weight: 600;
}
```
transformed with css modules
```css
.root_01 {
    border-width: 2px;
    border-style: solid;
    border-color: #777;
    padding: 0 20px;
    margin: 0 6px;
    max-width: 400px;
}

.text_1217 {
    color: #777;
    font-size: 24px;
    font-family: helvetica, arial, sans-serif;
    font-weight: 600;
}
```

and importing it

```js
import '/main.css';
// Named imports will use css modules
import styles from '/main.css';
// Or with destructure
import {root, text as t} from '/main.css';
```
or similar expressions with require
```js
require('/main.css');
// Named imports will use css modules
const styles = require('/main.css');
// Or with destructure
const {root, text: t} = require('/main.css');
```
we will obtain
```js
const _ref = document.createElement("link");
_ref.rel = "stylesheet";
_ref.href = "/main.css";
document.head.appendChild(_ref);

// Named imports will use css modules
const _ref2 = document.createElement("link");
_ref2.rel = "stylesheet";
_ref2.href = "/main.css";
document.head.appendChild(_ref2);
const styles = {
  root: 'root_01',
  text: 'text_1217',
  color: 'color_918'
};

// Or with destructure
const _ref3 = document.createElement("link");
_ref3.rel = "stylesheet";
_ref3.href = "/main.css";
document.head.appendChild(_ref3);
const {
  root: root,
  text: t
} = {
  root: 'root_01',
  text: 'text_1217'
};
```
