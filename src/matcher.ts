/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

export interface MatcherWithPriority<T> {
	matcher: Matcher<T>;
	priority: -1 | 0 | 1;
}

export interface Matcher<T> {
	(matcherInput: T): boolean;
}
/**注入点匹配? */
export function createMatchers<T>(selector: string, matchesName: (names: string[], matcherInput: T) => boolean): MatcherWithPriority<T>[] {
	/**列表 */
	const results = <MatcherWithPriority<T>[]>[];
	/**触发继续匹配的 */
	const tokenizer = newTokenizer(selector);
	/**匹配的token */
	let token = tokenizer.next();
	while (token !== null) {
		/**判断左插入还是右插入 */
		let priority: -1 | 0 | 1 = 0;
		// 左右判断
		if (token.length === 2 && token.charAt(1) === ':') {
			switch (token.charAt(0)) {
				case 'R': priority = 1; break;
				case 'L': priority = -1; break;
				default:
					console.log(`Unknown priority ${token} in scope selector`);
			}
			token = tokenizer.next();
		}
		let matcher = parseConjunction();
		results.push({ matcher, priority });
		if (token !== ',') {
			break;
		}
		token = tokenizer.next();
	}
	return results;
/**解析操作数 */
	function parseOperand(): Matcher<T> | null {
		// - 拿下一个 继续找下一个
		if (token === '-') {
			token = tokenizer.next();
			const expressionToNegate = parseOperand();
			return matcherInput => !!expressionToNegate && !expressionToNegate(matcherInput);
		}
		// ( 返回匹配表达式
		if (token === '(') {
			token = tokenizer.next();
			const expressionInParents = parseInnerExpression();
			if (token === ')') {
				token = tokenizer.next();
			}
			return expressionInParents;
		}
		if (isIdentifier(token)) {
			const identifiers: string[] = [];
			do {
				identifiers.push(token);
				token = tokenizer.next();
			} while (isIdentifier(token));
			return matcherInput => matchesName(identifiers, matcherInput);
		}
		return null;
	}
	/**返回一个全匹配函数 */
	function parseConjunction(): Matcher<T> {
		const matchers: Matcher<T>[] = [];
		let matcher = parseOperand();
		while (matcher) {
			matchers.push(matcher);
			matcher = parseOperand();
		}
		return matcherInput => matchers.every(matcher => matcher(matcherInput)); // and
	}
	/**解析内部表达式 */
	function parseInnerExpression(): Matcher<T> {
		const matchers: Matcher<T>[] = [];
		let matcher = parseConjunction();
		while (matcher) {
			matchers.push(matcher);
			//忽略| ,
			if (token === '|' || token === ',') {
				do {
					token = tokenizer.next();
				} while (token === '|' || token === ','); // ignore subsequent commas
			} else {
				break;
			}
			matcher = parseConjunction();
		}
		return matcherInput => matchers.some(matcher => matcher(matcherInput)); // or
	}
}
/**是不是identifier */
function isIdentifier(token: string | null): token is string {
	return !!token && !!token.match(/[\w\.:]+/);
}
/**正则匹配注入点结果,多次匹配 匹配L/R: sdfsf.: ,|-() */
function newTokenizer(input: string): { next: () => string | null } {
	let regex = /([LR]:|[\w\.:][\w\.:\-]*|[\,\|\-\(\)])/g;
	let match = regex.exec(input);
	return {
		next: () => {
			if (!match) {
				return null;
			}
			const res = match[0];
			match = regex.exec(input);
			return res;
		}
	};
}
