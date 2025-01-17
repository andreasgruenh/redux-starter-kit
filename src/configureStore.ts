import {
  createStore,
  compose,
  applyMiddleware,
  combineReducers,
  Reducer,
  ReducersMapObject,
  Middleware,
  Action,
  AnyAction,
  StoreEnhancer,
  Store,
  DeepPartial
} from 'redux'
import {
  composeWithDevTools,
  EnhancerOptions as DevToolsOptions
} from 'redux-devtools-extension'
import { ThunkDispatch } from 'redux-thunk'

import isPlainObject from './isPlainObject'
import { getDefaultMiddleware } from './getDefaultMiddleware'

const IS_PRODUCTION = process.env.NODE_ENV === 'production'

export type ConfigureEnhancersCallback = (
  defaultEnhancers: StoreEnhancer[]
) => StoreEnhancer[]

/**
 * Options for `configureStore()`.
 */
export interface ConfigureStoreOptions<S = any, A extends Action = AnyAction> {
  /**
   * A single reducer function that will be used as the root reducer, or an
   * object of slice reducers that will be passed to `combineReducers()`.
   */
  reducer: Reducer<S, A> | ReducersMapObject<S, A>

  /**
   * An array of Redux middleware to install. If not supplied, defaults to
   * the set of middleware returned by `getDefaultMiddleware()`.
   */
  middleware?: Middleware<{}, S>[]

  /**
   * Whether to enable Redux DevTools integration. Defaults to `true`.
   *
   * Additional configuration can be done by passing Redux DevTools options
   */
  devTools?: boolean | DevToolsOptions

  /**
   * The initial state, same as Redux's createStore.
   * You may optionally specify it to hydrate the state
   * from the server in universal apps, or to restore a previously serialized
   * user session. If you use `combineReducers()` to produce the root reducer
   * function (either directly or indirectly by passing an object as `reducer`),
   * this must be an object with the same shape as the reducer map keys.
   */
  // NOTE: The needlessly complicated `S extends any ? S : S` instead of just
  // `S` ensures that the TypeScript compiler doesn't attempt to infer `S`
  // based on the value passed as `preloadedState`, which might be a partial
  // state rather than the full thing.
  preloadedState?: DeepPartial<S extends any ? S : S>

  /**
   * The store enhancers to apply. See Redux's `createStore()`.
   * All enhancers will be included before the DevTools Extension enhancer.
   * If you need to customize the order of enhancers, supply a callback
   * function that will receive the original array (ie, `[applyMiddleware]`),
   * and should return a new array (such as `[applyMiddleware, offline]`).
   * If you only need to add middleware, you can use the `middleware` parameter instaead.
   */
  enhancers?: StoreEnhancer[] | ConfigureEnhancersCallback
}

/**
 * A Redux store returned by `configureStore()`. Supports dispatching
 * side-effectful _thunks_ in addition to plain actions.
 */
export interface EnhancedStore<S = any, A extends Action = AnyAction>
  extends Store<S, A> {
  dispatch: ThunkDispatch<S, any, A>
}

/**
 * A friendly abstraction over the standard Redux `createStore()` function.
 *
 * @param config The store configuration.
 * @returns A configured Redux store.
 */
export function configureStore<S = any, A extends Action = AnyAction>(
  options: ConfigureStoreOptions<S, A>
): EnhancedStore<S, A> {
  const {
    reducer = undefined,
    middleware = getDefaultMiddleware(),
    devTools = true,
    preloadedState = undefined,
    enhancers = undefined
  } = options || {}

  let rootReducer: Reducer<S, A>

  if (typeof reducer === 'function') {
    rootReducer = reducer
  } else if (isPlainObject(reducer)) {
    rootReducer = combineReducers(reducer)
  } else {
    throw new Error(
      'Reducer argument must be a function or an object of functions that can be passed to combineReducers'
    )
  }

  const middlewareEnhancer = applyMiddleware(...middleware)

  let finalCompose = compose

  if (devTools) {
    finalCompose = composeWithDevTools({
      // Enable capture of stack traces for dispatched Redux actions
      trace: !IS_PRODUCTION,
      ...(typeof devTools === 'object' && devTools)
    })
  }

  let storeEnhancers: StoreEnhancer[] = [middlewareEnhancer]

  if (Array.isArray(enhancers)) {
    storeEnhancers = [middlewareEnhancer, ...enhancers]
  } else if (typeof enhancers === 'function') {
    storeEnhancers = enhancers(storeEnhancers)
  }

  const composedEnhancer = finalCompose(...storeEnhancers) as StoreEnhancer

  return createStore(
    rootReducer,
    preloadedState as DeepPartial<S>,
    composedEnhancer
  )
}
