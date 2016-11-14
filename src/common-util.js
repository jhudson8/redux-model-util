// return the value by doing a deeep inspection using the parts array
export function deepPropValue (parts, parent) {
  for (let i = 0; i < parts.length && parent; i++) {
    parent = parent[parts[i]];
  }
  return parent;
}

export function checkRequiredOptions (keys, options) {
  if (!options) {
    throw new Error('missing options');
  }
  keys.forEach(function (key) {
    if (!options[key]) {
      throw new Error('missing "' + key + '" options value');
    }
  });
}