import {
  ModelCacheOptions,
  ActionPerformResponse
} from './types';
/**
 * Return the model specific utility object
 * @param {object} modelOrDomain: the model object or entityType state object (if model `id` is provided)
 * @param {string} id: the model id if `modelOrDomain` represents the entityType state object
 */
import { ModelConstructorOptions } from './types';

const NO_ID = '_noid_';

export default class Model {
  id: any;
  private _value?: any;
  private _meta?: any;
  private _data?: any;
  private formatted: any = false;
  private entities?: any;
  private options?: ModelConstructorOptions;
  private formattedValue?: any;

  constructor (options: ModelConstructorOptions) {
    let entities = options.entities;
    const id = this.id = determineId(options.id);
    const entityType = options.entityType;

    if (entities) {
      // allow for root state to be passed
      entities = entities.entities || entities;
    }

    const value: any = options.value || deepValue(entities, [entityType, id]);
    const meta: any = options.meta || deepValue(entities, ['_meta', entityType, id]);

    this.entities = entities;
    this._value = value;
    this.options = options;
    this._meta = meta || {};
    this._data = this._meta.data || {};
  }

  meta (): any {
    return this._meta;
  }

  /**
   * Return the (optionally formatted) model data
   */
  value (): any {
    if (!this.formatted) {
      this.formatted = true;
      const options = this.options;
      if (this._value && options.schema && options.denormalize) {
        this.formattedValue = options.denormalize(
          this._value,
          options.schema,
          this.entities
        );
      } else {
        const formatter = options.formatter;
        this.formattedValue = formatter
          ? formatter(this._value, options)
          : this._value;
      }
      let arrayEntrySchema = options.arrayEntrySchema;
      let ArrayEntryModel = Model;
      if (arrayEntrySchema && this.formattedValue) {
        if (arrayEntrySchema.model) {
          ArrayEntryModel = arrayEntrySchema.model || Model;
          arrayEntrySchema = arrayEntrySchema.schema;
        }
        this.formattedValue = this.formattedValue.map((data) => {
          return new ArrayEntryModel({
            entities: this.entities,
            id: arrayEntrySchema.getId(data),
            entityType: arrayEntrySchema.key
          });
        });
      }
    }
    return this.formattedValue;
  }

  /**
   * Return metadata associated with this model
   */
  data (): any {
    return this._data;
  }

  /**
   * Return truthy if the model has been fetched (`fetched` if fetched and `set` if used with constructor to set value)
   */
  wasFetched (): boolean {
    const meta: any = getMeta(this);
    let rtn = !!meta.fetch && meta.fetch.success;
    if (!rtn && this.value()) {
      rtn = true;
    }
    return !!(rtn || this.value());
  }

  /**
   * Return true if there is not a fetch pending or the model has been sucessfully fetched
   */
  canBeFetched (): boolean {
    const meta: any = getMeta(this);
    const fetchData = meta.fetch;
    const hasValue = typeof this._value === 'function' && this.value();
    if (fetchData) {
      if (fetchData.pending) {
        return false;
      } else {
        return !(fetchData.success || !!hasValue);
      }
    } else {
      return !hasValue;
    }
  }

  /**
   * Return a truthy (timestamp of when the fetch was initiated) if a fetch is pending
   */
  isFetchPending (): boolean {
    const meta: any = getMeta(this);
    const fetchData = meta.fetch;
    return (fetchData && fetchData.pending) || false;
  }

  /**
   * Return a fetch success result or false
   */
  fetchSuccess (): any {
    const meta: any = getMeta(this);
    const fetchData = meta.fetch;
    return (fetchData && fetchData.success) || false;
  }

  /**
   * Return a fetch error result or false
   */
  fetchError (): any {
    const meta: any = getMeta(this);
    const fetchData = meta.fetch;
    return (fetchData && fetchData.error) || false;
  }

  /**
   * Return a truthy (timestamp of action initiation) if the action is pending
   * @param {string} id: optinal identifier to see if a specific action is currently in progress
   * @paramm {string} actionId: action id
   */
  isActionPending (actionId: any): boolean {
    verifyActionId(actionId);
    const meta: any = getMeta(this);
    const actionData = meta.actions && meta.actions[actionId];
    return (actionData && actionData.pending) || false;
  }

  /**
   * If an action was performed and successful, return { success, error, pending }.  `success` and `error` will be mutually exclusive and will
   * represent the XHR response payload
   * @paramm {string} actionId: action id to only return true if a specific action was performed
   */
  wasActionPerformed (actionId: any): ActionPerformResponse {
    verifyActionId(actionId);
    const meta: any = getMeta(this);
    const actionData = meta.actions;
    return actionData && actionData[actionId];
  }

  /**
   * If an action was performed and is an in error state, return the error response
   * @paramm {string} actionId: action id to only return true if a specific action was performed
   * @returns the error response payload
   */
  actionError (actionId: any): any {
    verifyActionId(actionId);
    const meta: any = getMeta(this);
    const actionData = meta.actions;
    return (actionData && actionData[actionId] && actionData[actionId].error) || null;
  }

  /**
   * If an action was performed and is in success state, return the success response
   * @paramm {string} actionId: action id to only return true if a specific action was performed
   * @returns the success response payload or true if the response was a success
   */
  actionSuccess (actionId: any): any {
    verifyActionId(actionId);
    const meta: any = getMeta(this);
    const actionData = meta.actions;
    return (actionData && actionData[actionId] && actionData[actionId].success) || null;
  }

  /**
   * Return the number of milis since the last fetch completion (success or error)
   */
  timeSinceFetch (currentTime?: number): number {
    const meta: any = getMeta(this);
    const fetchTime = (meta.fetch && meta.fetch.completedAt);
    return fetchTime ? (currentTime || new Date().getTime()) - fetchTime : -1;
  }

  /**
   * Return a model from the cache object and create one if one does not exist
   */
  static fromCache (options: ModelCacheOptions, cache?: any) {
    if (!cache) {
      return null;
    }

    const id = determineId(options.id);
    const entityType = options.entityType;
    const ModelClass = options.modelClass || Model;
    let entities = options.entities || {};
    // allow for root state to be provided
    entities = entities.entities || entities;
    const cachedEntities = cache[entityType] = cache[entityType] || {};
    const cachedMeta = cache._meta = cache._meta || {};
    const cachedModels = cachedEntities.__models = cachedEntities.__models || {};

    let cachedModel = cachedModels[id];
    const cachedData = getMetaAndValue(id, cache, entityType);
    const checkData = getMetaAndValue(id, entities, entityType);
    if (!cachedModel || cachedData.meta !== checkData.meta || cachedData.value !== checkData.value) {
      // we need to cache and return a new model
      cachedEntities[id] = checkData.value;
      const cachedMetaEntity = cachedMeta[entityType] = cachedMeta[entityType] || {};
      cachedMetaEntity[id] = checkData.meta || cachedMetaEntity[id];
      cachedModel = new ModelClass({
        id: id,
        entityType: options.entityType,
        entities: options.entities,
        meta: cachedMetaEntity[id]
      }); // joe
      cachedModels[id] = cachedModel;
    }
    return cachedModel;
  }

  /**
   * Clear the model referred to by the entity type and id from the cache
   */
  static clearCache (id: any, entityType: string, cache?: any) {
    if (!cache) {
      return;
    }

    id = determineId(id);
    var metaTypes = deepValue(cache, ['_meta', entityType]);
    if (metaTypes) {
      delete metaTypes[id];
    }
    const entityTypes = cache[entityType];
    if (entityTypes) {
      delete entityTypes[id];
    }
    const models = deepValue(cache, [entityType, '__models']);
    if (models) {
      delete models[id];
    }
  }
}

// allow the following to have static accessors
[
  'data', 'wasFetched', 'canBeFetched', 'isFetchPending', 'fetchSuccess', 'fetchError', 'isActionPending',
  'wasActionPerformed', 'actionError', 'actionSuccess', 'timeSinceFetch'
].forEach(function (key) {
  const func = Model.prototype[key];
  Model[key] = function() {
    const meta = arguments[0];
    const args = Array.prototype.slice.call(arguments, 1);
    return func.apply({ __static: { meta }}, args);
  }
});

function determineId (id) {
  return id === false ? NO_ID : id;
}

function getMetaAndValue (id, entities, entityType) {
  return {
    meta: deepValue(entities, ['_meta', entityType, id]) || null,
    value: deepValue(entities, [entityType, id]) || null
  };
}

function deepValue (parent, parts) {
  for (let i = 0; i < parts.length && parent; i++) {
    parent = parent[parts[i]];
  }
  return parent;
}

function verifyActionId (actionId) {
  if (!actionId) {
    throw new Error('action id must be provided');
  }
}

function getMeta (context) {
  return context._meta ? context._meta : context.__static ? context.__static.meta : undefined;
}
