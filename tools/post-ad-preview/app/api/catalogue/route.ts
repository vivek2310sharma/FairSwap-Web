import rows from '../../../../../src/lib/listings/csv-fields/generated/catalogues.v1.json';
import { lookupCatalogue } from '../../../../../src/lib/listings/csv-fields/catalogue';

export function GET(request: Request) {
  try {
    const entries = [...new URL(request.url).searchParams.entries()];
    if (new Set(entries.map(([key]) => key)).size !== entries.length) throw new Error('Repeated lookup parameter');
    return Response.json(lookupCatalogue(rows.rows, Object.fromEntries(entries)));
  } catch (error) {
    return Response.json({error: error instanceof Error ? error.message : 'Invalid lookup'}, {status: 400});
  }
}
