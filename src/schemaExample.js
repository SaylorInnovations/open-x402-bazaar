// Generates an illustrative example instance from a JSON-Schema-shaped
// output_schema — never a captured real response. Prefers whatever the schema
// author actually supplied (example/examples/default/enum) so it stays honest
// when a provider has given real values; falls back to type-appropriate
// placeholders only where nothing was supplied. Used to give agents a concrete,
// parseable illustration of a resource's shape before they pay for it.
function exampleFromSchema(schema, depth = 0) {
  if (!schema || typeof schema !== 'object' || depth > 6) return null;
  if (schema.example !== undefined) return schema.example;
  if (Array.isArray(schema.examples) && schema.examples.length > 0) return schema.examples[0];
  if (schema.default !== undefined) return schema.default;
  if (Array.isArray(schema.enum) && schema.enum.length > 0) return schema.enum[0];

  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;

  if (schema.properties && typeof schema.properties === 'object') {
    const out = {};
    for (const [key, sub] of Object.entries(schema.properties)) {
      out[key] = exampleFromSchema(sub, depth + 1);
    }
    return out;
  }
  if (type === 'array' || schema.items) {
    const item = exampleFromSchema(schema.items, depth + 1);
    return [item === null ? 'value' : item];
  }
  switch (type) {
    case 'string':
      return schema.format === 'date-time' ? '2026-01-01T00:00:00Z' : schema.format === 'uri' ? 'https://example.com' : 'string';
    case 'number':
      return 0;
    case 'integer':
      return 0;
    case 'boolean':
      return true;
    case 'null':
      return null;
    case 'object':
      return {};
    default:
      return null;
  }
}

export { exampleFromSchema };
