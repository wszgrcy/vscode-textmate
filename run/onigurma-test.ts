import * as oniguruma from 'oniguruma';
let scanner = new oniguruma.OnigScanner(['sdf']);

let result = scanner.findNextMatchSync('abc', 0);
console.log(result);
/**
 * oniguruma 是先初始化,初始的是正则,然后find的时候按顺序,先找到先返回
 *
 */