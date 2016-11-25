const M = require('route-recognizer')

export function createMatcher<T>(): Matcher<T> {
	return new M()
}

export interface Matcher<H> {
	add: (routes: Route<H>[]) => void
	recognize: (path: string) => MatchedRoute<H>[]
}

export interface Route<H> {
	path: string
	handler: H
}

export interface MatchedRoute<H> {
	handler: H
	params: {}
}
