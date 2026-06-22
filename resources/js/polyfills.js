// Polyfills para navegadores antigos (ex.: iPhone iOS 14.6 / Safari 14).
// Inertia 2 usa structuredClone; libs modernas usam Object.hasOwn — ambos faltam no Safari 14.
if (typeof Object.hasOwn !== 'function') {
  Object.hasOwn = function (obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
  };
}
if (typeof globalThis.structuredClone !== 'function') {
  globalThis.structuredClone = function (value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  };
}
